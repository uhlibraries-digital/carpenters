# Carpenters

### Description

Carpenters is an ingest tool that allows archival curators, digitization technicians, and preservation administrators to organize digitized content into hierarchies that preserve the contextual linkages and provenance of the original archival collection.  The tool allows for easy batch ingest preparation--creating nested directory structures and automatically organizing files in such a way that the resultant Archivematica-compatible SIP seamlessly replicates the physical arrangement of the original collection.  The tool eliminates the need for manually creating directories or moving files, making it ideal for large-scale workflows.  The tool also has the capacity to mint package-specific ARKs, allowing the preservation package to have a persistent identifier that connects preservation master files to access objects.

### Packaging

You can package Carpenters by running the following commands based on your target system:

* `npm run package:osx` will package for MacOS X x64
* `npm run package:win` will package for Windows x64
* `npm run package:linux` will package for Linux x64
* `npm run package` will package all the above

All packages are stored in the `bin` directory that gets created during the build process.

To learn more about distributing, please read the [Application Distribution](http://electron.atom.io/docs/tutorial/application-distribution/) documentation from Electron.

### Development

Carpenters is built with [Angular 2](https://angular.io/) using Typescript. The main application starts in `app/app.ts`.

To build the application you can run one of these commands:

* `npm run build` will build the application
* `npm run election` will build the application and start electron
* `npm run watch` will watch the directory for changes and re-build the application

## License

[MIT License](LICENSE.txt)
