export default {
  generatorConfig: {
    controller: {
      directory: 'app/io/controller',
      generator: 'auto',
      interface: 'CustomController',
      watch: true,
    },
    middleware: {
      directory: 'app/io/middleware',
      generator: 'auto',
      interface: 'CustomMiddleware',
      watch: true,
    },
  },
};