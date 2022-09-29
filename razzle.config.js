/**
 * Replace with custom razzle config when needed.
 * @module razzle.config
 */

const jsConfig = require("./jsconfig").compilerOptions;
const path = require("path");
const { map } = require("lodash");
const glob = require("glob").sync;
const fs = require("fs");
const nodeExternals = require("webpack-node-externals");
const AddonConfigurationRegistry = require("./node_modules/@plone/volto/addon-registry");
const ItaliaAddonConfigurationRegistry = require("./italia-addon-registry");
const { poToJson } = require("./src/i18n");

const pathsConfig = jsConfig.paths;

let voltoPath = path.resolve("./node_modules/@plone/volto");
const createAddonsLoader = require(`${voltoPath}/create-addons-loader`);

Object.keys(pathsConfig).forEach((pkg) => {
  if (pkg === "@plone/volto") {
    voltoPath = path.resolve(`./${jsConfig.baseUrl}/${pathsConfig[pkg][0]}`);
  }
});

let italiaThemePath = path.resolve("./node_modules/design-volto-theme");

Object.keys(pathsConfig).forEach((pkg) => {
  if (pkg === "design-volto-theme") {
    italiaThemePath = path.resolve(
      `./${jsConfig.baseUrl}/${pathsConfig[pkg][0]}`
    );
  }
});

const projectRootPath = path.resolve(".");

const addonsRegistry = new AddonConfigurationRegistry(projectRootPath);
const italiaAddonsRegistry = new ItaliaAddonConfigurationRegistry(
  italiaThemePath,
  voltoPath,
);

const packageJson = require(path.join(projectRootPath, "package.json"));
const italiaPackageJson = require(path.join(italiaThemePath, "package.json"));

const italia_config = require(`${italiaThemePath}/razzle.config`);

module.exports = Object.assign({}, italia_config, {
  modifyWebpackConfig: ({
    env: { target, dev },
    webpackConfig,
    webpackObject,
  }) => {
    const base_config = italia_config.modifyWebpackConfig({
      env: { target, dev },
      webpackConfig,
      webpackObject,
    });

    // Compile language JSON files from po files
    poToJson();

    const jsconfigPaths = {};
    if (fs.existsSync(`${projectRootPath}/jsconfig.json`)) {
      const jsConfig = require(`${projectRootPath}/jsconfig`).compilerOptions;
      const pathsConfig = jsConfig.paths;
      Object.keys(pathsConfig).forEach((packageName) => {
        const packagePath = `${projectRootPath}/${jsConfig.baseUrl}/${pathsConfig[packageName][0]}`;
        jsconfigPaths[packageName] = packagePath;
        if (packageName === "@plone/volto") {
          voltoPath = packagePath;
        }
        if (packageName === "design-volto-theme") {
          italiaThemePath = packagePath;
        }
      });
    }

    if (fs.existsSync(`${italiaThemePath}/jsconfig.json`)) {
      const jsConfig = require(`${italiaThemePath}/jsconfig`).compilerOptions;
      const pathsConfig = jsConfig.paths;
      Object.keys(pathsConfig).forEach((packageName) => {
        const packagePath = `${italiaThemePath}/${jsConfig.baseUrl}/${pathsConfig[packageName][0]}`;
        jsconfigPaths[packageName] = packagePath;
        jsconfigPaths[packageName.replace("@italia/addons/", "")] = packagePath;
      });
    }

    const addons = [
      ...new Set([
        ...(italiaPackageJson.addons.map(
          (addon) => `@italia/addons/${addon}`
        ) || []),
        ...(packageJson.addons || []),
      ]),
    ];
    const addonsLoaderPath = createAddonsLoader(addons);

    const aliases = {};
    let { customizationPaths } = packageJson;
    if (!customizationPaths) {
      customizationPaths = [
        "node_modules/design-volto-theme/src/customizations/",
        "src/customizations-italia/",
      ];
    }
    customizationPaths.forEach((customizationPath) => {
      customizationPath = customizationPath.endsWith("/")
        ? customizationPath.slice(0, customizationPath.length - 1)
        : customizationPath;
      const base = path.join(projectRootPath, customizationPath);
      const reg = [];

      addons.forEach((addon) => {
        let addonName = addon.replace("@italia/addons/", "");
        if (fs.existsSync(path.join(base, addonName))) {
          reg.push({
            customPath: path.join(base, addonName),
            sourcePath: jsconfigPaths[addon],
            name: addonName,
          });
        }
      });

      if (customizationPath.includes("customizations-italia")) {
        reg.push({
          customPath: base,
          sourcePath: `${italiaThemePath}/src`,
          name: "@italia",
        });
      } else {
        reg.push(
          fs.existsSync(path.join(base, "volto"))
            ? {
                // new style (addons) customizations
                customPath: path.join(base, "volto"),
                sourcePath: `${voltoPath}/src`,
                name: "@plone/volto",
              }
            : {
                // old style, customizations directly in folder
                customPath: base,
                sourcePath: `${voltoPath}/src`,
                name: "@plone/volto",
              }
        );
      }

      reg.forEach(({ customPath, name, sourcePath }) => {
        map(
          glob(`${customPath}/**/*.*(svg|png|jpg|jpeg|gif|ico|less|js|jsx)`),
          (filename) => {
            const targetPath = filename.replace(customPath, sourcePath);
            if (fs.existsSync(targetPath)) {
              aliases[
                filename.replace(customPath, name).replace(/\.(js|jsx)$/, "")
              ] = path.resolve(filename);
            } else {
              console.log(
                `The file ${filename} doesn't exist in the ${name} (${targetPath}), unable to customize.`
              );
            }
          }
        );
      });
    });

    base_config.resolve.alias = {
      ...italiaAddonsRegistry.getAddonCustomizationPaths(),
      ...aliases,
      ...base_config.resolve.alias,
      "load-volto-addons": addonsLoaderPath,
      "../../theme.config$": `${projectRootPath}/theme/theme.config`,
      ...jsconfigPaths,
      "@plone/volto": `${voltoPath}/src`,
      // to be able to reference path uncustomized by webpack
      "@plone/volto-original": `${voltoPath}/src`,
      "@italia": `${italiaThemePath}/src`,
      "@italia-original": `${italiaThemePath}/src`,
      // be able to reference current package from customized package
      "@package": `${projectRootPath}/src`,
    };

    const babelRuleIndex = webpackConfig.module.rules.findIndex(
      (rule) =>
        rule.use &&
        rule.use[0].loader &&
        rule.use[0].loader.includes("babel-loader")
    );
    const { include: babelInclude } =
      webpackConfig.module.rules[babelRuleIndex];
    babelInclude.push(fs.realpathSync(`${italiaThemePath}/src`));
    // Add babel support external (ie. node_modules npm published packages)
    if (packageJson.addons) {
      packageJson.addons.forEach((addon) =>
        babelInclude.push(
          fs.realpathSync(addonsRegistry.packages[addon].modulePath)
        )
      );
    }

    if (italiaPackageJson.addons) {
      italiaPackageJson.addons.forEach((addon) => {
        return babelInclude.push(
          fs.realpathSync(italiaAddonsRegistry.packages[addon].modulePath)
        );
      });
    }

    webpackConfig.module.rules[babelRuleIndex] = Object.assign(
      webpackConfig.module.rules[babelRuleIndex],
      {
        include: babelInclude,
      }
    );

    let addonsAsExternals = [];
    if (packageJson.addons) {
      addonsAsExternals = addonsRegistry.addonNames.map(
        (addon) => new RegExp(addon)
      );
    }

    if (italiaPackageJson.addons) {
      addonsAsExternals = addonsAsExternals
        .concat(
          italiaAddonsRegistry.addonNames.map(
            (addon) => new RegExp(`@italia/addons/${addon}`)
          )
        )
        .concat(
          italiaAddonsRegistry.addonNames.map((addon) => new RegExp(addon))
        );
    }

    webpackConfig.externals =
      target === "node"
        ? [
            nodeExternals({
              whitelist: [
                dev ? "webpack/hot/poll?300" : null,
                /\.(eot|woff|woff2|ttf|otf)$/,
                /\.(svg|png|jpg|jpeg|gif|ico)$/,
                /\.(mp4|mp3|ogg|swf|webp)$/,
                /\.(css|scss|sass|sss|less)$/,
                // Add support for whitelist external (ie. node_modules npm published packages)
                ...addonsAsExternals,
                /^@plone\/volto/,
              ].filter(Boolean),
            }),
          ]
        : [];

    const lessLoaderRuleIndex = webpackConfig.module.rules.findIndex(
      (rule) =>
        rule.use &&
        Array.isArray(rule.use) &&
        rule.use.slice(-1)[0].loader &&
        rule.use.slice(-1)[0].loader.includes("less-loader")
    );
    const { include: lessInclude } =
      webpackConfig.module.rules[lessLoaderRuleIndex];
    lessInclude.push(fs.realpathSync(`${italiaThemePath}/theme`));
    webpackConfig.module.rules[lessLoaderRuleIndex] = Object.assign(
      webpackConfig.module.rules[lessLoaderRuleIndex],
      {
        include: lessInclude,
      }
    );

    return base_config;
  },
});
