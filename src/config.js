// create and export config vars

// container for all the env vars
const env = {};

// staging/dev env (default)
env.staging = {
  PORT: 3000,
  ENV_NAME: 'staging',
};

// production env
env.production = {
  PORT: 5000,
  ENV_NAME: 'production',
};

// determine which env vars to export
const currentEnv = process.env.NODE_ENV ? process.env.NODE_ENV.toLowerCase() : '';

// check that currentEnv is one of our defined envs
export default env[currentEnv] ? env[currentEnv] : env.staging;
