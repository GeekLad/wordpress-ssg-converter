# Wordpress SSG Converter

There are many different tools for converting a WordPress XML/WXR file to a flat-file format for single-site generator (SSG) tools. Many, if not most SSG tools do not have a standard file format/structure for blogs, and it is up to individual template builders to design the format. This tool is designed to take a WordPress XML/WXR file and output it into any desired output format.

## Getting Started

You can just usit it directly online on [CodeSandbox](https://codesandbox.io/) [here](https://1rfdc.csb.app/).

## How it Works

There's one main library file I built, wordpress.ts, that will take a string with the WordPress export and convert it into a well-structured TypeScript objects. The main magic takes place with the Post & Page objects.

The web interface provides a simple interface into the library, and a few parameters for customzing the conversion. The final output is a zip archive, with the specified structure.

You use [handlebars](https://handlebarsjs.org) tags to specify attributes from the post/page objects.

### Customizing Posts and Pages

Here are the properties you can access using handlebars tags, to get the output structure and file format you want:

- id
- title
- url
- path
- slug
- pubDate
- status
- html
- markdown
- month
- monthZeroPadded
- monthName
- monthShortName
- day
- dayZeroPadded
- year
- shortYear
- firstImage
- firstImageMarkdown

### Installing

If you want to run it locally, you'll need [Node.js](https://nodejs.org). Just do a git pull, change to the local repo directory, and run npm run start.

## Built With

- [React](https://reactjs.org/) - A JavaScript UI framework
- [Material UI](https://maven.apache.org/) - A React UI framework
- [TypeScript](https://typescriptlang.org/) - A strongly typed programming language that transpiles to JavaScript
- [Turndown](https://github.com/domchristie/turndown) - A JavaScript library for converting HTML files to Markdown
- [JSZip](https://stuk.github.io/jszip/) - A JavaScript libary for manipulating zip archives
- [https://handlebarsjs.com/](https://handlebarsjs.com/)

## Todo

**Lots**
