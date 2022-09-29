/**
 * Add your config changes here.
 * @module config
 */

import applyItaliaConfig from '@italia/config/italiaConfig';
import '@plone/volto/config';

export default function applyConfig(voltoConfig) {
  let config = applyItaliaConfig(voltoConfig);

  config.settings = {
    ...config.settings,
    // italiaThemeViewsConfig: {
    //   ...config.settings.italiaThemeViewsConfig,
    //   imagePosition: 'afterHeader', // possible values: afterHeader, documentBody
    // },
    siteProperties: {
      /*
        Per tutte le props di siteProperties, può essere definito un oggetto per i siti multilingua, strutturato in questo modo:
        {'default': _valore_della_prop, 'it': _valore_della_prop,...}
        Se l'oggetto non è strutturato in questo modo, viene usato l'oggetto stesso, altrimenti viene preso il valore della corrispondente alla prop della lingua corrente o alla prop 'default' se esiste.
      */
      ...config.settings.siteProperties,
      siteTitle: 'Nome del Comune',
      siteSubtitle: 'Sottotilo comune',
      parentSiteTitle: 'Regione Emilia-Romagna',
      parentSiteURL: 'https://www.regione.emilia-romagna.it/',
      subsiteParentSiteTitle: 'Nome del Comune - Sottotitolo',
      // enableCustomerSatisfaction: false, // false per disabilitare
      //arLoginUrl: '/it/area-riservata',
      //arLogoutUrl: '/logout',
      // smallFooterLinks: {
      //   default: [{ title: 'Mappa del sito', url: '/sitemap' }],
      //   it: [{ title: 'Mappa del sito', url: '/it/sitemap' }],
      //   en: [{ title: 'Sitemap', url: '/en/sitemap' }],
      // },
    },
  };

  // config.views = {
  //   ...config.views,
  // };
  // config.widgets = {
  //   ...config.widgets,
  // };

  config.blocks.blocksConfig.listing = {
    ...config.blocks.blocksConfig.listing,
    variations: [
      ...config.blocks.blocksConfig.listing.variations,
      // {
      //   id: 'cardWithSideImageTemplate',
      //   isDefault: false,
      //   title: 'Card con immagine affiancata',
      //   template: CardWithSideImageTemplate,
      //   skeleton: CardWithSideImageTemplateSkeleton,
      //   schemaEnhancer: ({ schema, formData, intl }) => {
      //     let pos = addDefaultOptions(schema, formData, intl);
      //     addCardWithSideImageTemplateOptions(schema, formData, intl, pos);
      //     return schema;
      //   },
      // },
    ],
    listing_bg_colors: [], //{name:'blue', label:'Blu'},{name:'light-blue', label:'Light blue'},{name:'sidebar-background', label:'Grey'}
    listing_items_colors: [], //{name:'blue', label:'Blu'},{name:'light-blue', label:'Light blue'},{name:'sidebar-background', label:'Grey'}
  };

  return config;
}
