# Noodl Cloud Service

Welcome to the Noodl Cloud Service project! In this repository, you can find the Self-Hosted Noodl Cloud Service.

This contains an NPM package making it easy to create a custom version on top of the Noodl Cloud Service.

There is also a Docker image making it easy to set up and host the normal Self-Hosted Noodl Cloud Service.

## Getting Started

This project is using `isolated-vm` to execute each Cloud Function in isolation from the other Cloud Functions.

Download [Docker Desktop](https://www.docker.com/products/docker-desktop) for Mac or Windows. [Docker Compose](https://docs.docker.com/compose) will be automatically installed. On Linux, make sure you have the latest version of [Compose](https://docs.docker.com/compose/install/).

Run in this directory to build and run the Cloud Service with a MongoDB instance:

```shell
docker compose up
```

The Cloud Service will be running at [http://localhost:3000](http://localhost:3000).

## About Noodl

Noodl is a low-code platform where designers and developers build custom applications and experiences. Designed as a visual programming environment, it aims to expedite your development process. It promotes the swift and efficient creation of applications, requiring minimal coding knowledge.

## License

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Contact

If you have any questions, concerns, or feedback, please open a discussion in the [discussions tracker](https://github.com/noodlapp/noodl-cloudservice/discussions) or join our Discord channel and we'll be happy to assist you!
