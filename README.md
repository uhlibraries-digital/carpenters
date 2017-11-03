# Carpenters

[![Build Status](https://travis-ci.org/uhlibraries-digital/carpenters.svg?branch=master)](https://travis-ci.org/uhlibraries-digital/carpenters)

### Description

Carpenters is an ingest tool that allows archival curators, digitization technicians, and preservation administrators to organize digitized content into hierarchies that preserve the contextual linkages and provenance of the original archival collection.  The tool allows for easy batch ingest preparation--creating nested directory structures and automatically organizing files in such a way that the resultant Archivematica-compatible SIP seamlessly replicates the physical arrangement of the original collection.  The tool eliminates the need for manually creating directories or moving files, making it ideal for large-scale workflows.  The tool also has the capacity to mint package-specific ARKs, allowing the preservation package to have a persistent identifier that connects preservation master files to access objects.

### Packaging

You can package Carpenters by running the following commands based on your target system:

* `npm run package:mac` will package for MacOS X x64
* `npm run package:win` will package for Windows x64
* `npm run package:linux` will package for Linux x64
* `npm run package` will package all the above

All packages are stored in the `app-builds` directory that gets created during the build process.

To learn more about distributing, please read the [Application Distribution](http://electron.atom.io/docs/tutorial/application-distribution/) documentation from Electron.

### Development

Carpenters is built with [Angular 4](https://angular.io/) using Typescript. You will need to have [NodeJS](https://nodejs.org/en/) installed to run the build commands. The main application starts in `main.ts`.

To build the application you can run one of these commands:

* `npm run build` will build the application
* `npm start` will build the application and start it

You need run a build `npm run build` before running `npm start` for the first time.
You will only need to do this once.

## License

[MIT License](LICENSE.txt)
