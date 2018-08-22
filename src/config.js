// create and export config vars

// container for all the env vars
const env = {};

// staging/dev env (default)
env.staging = {
  HTTP_PORT: 3000,
  HTTPS_PORT: 3001,
  ENV_NAME: 'staging',
};

// production env
env.production = {
  HTTP_PORT: 5000,
  HTTPS_PORT: 5001,
  ENV_NAME: 'production',
};

// determine which env vars to export
const currentEnv = process.env.NODE_ENV ? process.env.NODE_ENV.toLowerCase() : '';

// check that currentEnv is one of our defined envs
export default env[currentEnv] ? env[currentEnv] : env.staging;
