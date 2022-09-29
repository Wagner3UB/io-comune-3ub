const axios = require('axios').default;
//const https = require('https');
const host = process.env.RANCHER_API_HOST;
const apiUser = process.env.RANCHER_API_USER;
const apiPw = process.env.RANCHER_API_PW;
const cluster = process.env.RANCHER_CLUSTER_ID;
const project = process.env.RANCHER_PROJECT_ID;
const namespace = process.env.RANCHER_NAMESPACE;
const workload = process.env.RANCHER_WORKLOAD;
const image = process.env.CONTAINER_IMAGE;
const slackHookUrl = process.env.SLACK_HOOK_URL;
const jobUrl = process.env.CI_JOB_URL;

const api = `${host}/project/${cluster}:${project}/workloads/deployment:${namespace}:${workload}`;

console.log(`
Deploying image:
${image}
to Rancher at url:
${api}
`);

process.on('unhandledRejection', error => {
  axios.post(slackHookUrl, {
    text: `Oh no, il deployment di ${image} si è rotto!\n<${jobUrl}|Clicca qui> per vedere il log.`,
  });
  throw error;
});

(async () => {
  const config = {
    auth: {
      username: apiUser,
      password: apiPw,
    },
    //httpsAgent: new https.Agent({
      //rejectUnauthorized: false,
    //}),
  };

  console.log('Getting containers info...');
  const {
    data: { actions, containers, links },
  } = await axios.get(api, config);
  console.log('Got containers info...');
  console.log(containers);

  let needsRedeploy = false;
  const newContainers = containers.map(cont => {
    if (cont.image === image) {
      // images are equal when using the 'latest' tag, e.g. in staging
      needsRedeploy = true;
    }
    return {
      ...cont,
      image,
    };
  });

  console.log('Pushing new containers info...');
  console.log(newContainers);
  const res = await axios.put(
    links.update,
    { containers: newContainers },
    config,
  );
  console.log(res.status, ' - ', res.statusText);

  if (needsRedeploy) {
    await axios.post(actions.redeploy, null, config);
  }

  console.log(`Logging deployment to ${slackHookUrl}`);
  axios.post(slackHookUrl, {
    text: `Il deployment di ${image} è stato completato con successo! 🎉`,
  });
})();

