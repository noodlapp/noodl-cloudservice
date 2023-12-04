# Noodl Cloud Service

Welcome to the Noodl Cloud Service project!

## About Noodl

Noodl is the low-code platform where designers and developers build custom applications and experiences. Designed as a visual programming environment, it aims to expedite your development process. It promotes swift and efficient creation of applications, requiring minimal coding knowledge.

## Getting started

```js
const express = require('express')
const { createNoodlServer } = require("@noodl/cloudservices");

const noodlServer = createNoodlServer({
  port: 3000,
  databaseURI: "insert",
  masterKey: "insert",
  appId: "insert",
  parseOptions: {
    // set or override any of the Parse settings
    //
    // A custom file adaptor can be set here:
    // filesAdapter ...
  }
});

const server = express();
server.use("/", noodlServer.middleware);
server.listen(port, () => {
  console.log(`Noodl Cloud Service listening at http://localhost:${port}`);
});
```

## License

Please note that this project is released with a [Contributor Code of Conduct](../../CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

This project is licensed under the MIT License - see the [LICENSE.md](../../LICENSE.md) file for details.

## Contact

If you have any questions, concerns, or feedback, please open a discussion in the [discussions tracker](https://github.com/noodlapp/noodl-cloudservice/discussions) or join our Discord channel and we'll be happy to assist you!
