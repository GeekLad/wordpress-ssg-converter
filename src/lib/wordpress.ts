import * as parser from "fast-xml-parser";
import TurndownService from "turndown";
// import * as jsdom from 'jsdom';
import * as Handlebars from "handlebars";
import JSZip from "jszip";
import * as FileSaver from "file-saver";

interface WordPressBlogXML {
  title: string;
  link: string;
  description: string;
  pubDate: Date;
  language: string;
  "wp:wxr_version": number;
  "wp:base_site_url": string;
  "wp:base_blog_url": string;
  "wp:author": Array<AuthorXML>;
  "wp:category": Array<CategoryXML>;
  "wp:tag": Array<TagXML>;
  "wp:term": Array<TermXML>;
  generator: string;
  item: Array<ItemXML>;
}

interface AuthorXML {
  "wp:author_id": number;
  "wp:author_login": string;
  "wp:author_email": string;
  "wp:author_display_name:": string;
  "wp:author_first_name": string;
  "wp:author_last_name": string;
}

interface TagXML {
  "wp:term_id": number;
  "wp:tag_slug": string;
  "wp:tag_name": string;
}

interface CategoryXML {
  "wp:term_id": number;
  "wp:category_nicename": string;
  "wp:category_parent": string;
  "wp:cat_name": string;
}

interface TermXML {
  "wp:term_id": number;
  "wp:term_taxonomy": string;
  "wp:term_slug": string;
  "wp:term_parent": string;
  "wp:term_name": string;
}

type PostType = "attachment" | "page" | "post";
type CommentStatus = "open" | "closed";
type PingStatus = "open" | "closed";
type ItemStatus = "inherit" | "draft" | "publish" | "trash";

interface ItemXML {
  title: string;
  link: string;
  pubDate: Date;
  "dc:creator": string;
  guid: string;
  description: string;
  "content:encoded": string;
  "excerpt:encoded": string;
  "wp:post_id": number;
  "wp:post_date": Date;
  "wp:post_date_gmt": Date;
  "wp:comment_status": CommentStatus;
  "wp:ping_status": PingStatus;
  "wp:post_name": string;
  "wp:status": ItemStatus;
  "wp:post_parent": number;
  "wp:menu_order": number;
  "wp:post_type": PostType;
  "wp:post_password": string;
  "wp:is_sticky": number;
  category?: Array<string>;
  "wp:attachment_url"?: string;
  "wp:postmeta"?: Array<MetaXML>;
  "wp:comment"?: Array<CommentXML>;
}

interface MetaXML {
  "wp:meta_key": string;
  "wp:meta_value": string;
}

interface CommentXML {
  "wp:comment_id": number;
  "wp:comment_author": string;
  "wp:comment_author_email": string;
  "wp:comment_author_url": string;
  "wp:comment_author_IP": string;
  "wp:comment_date": Date;
  "wp:comment_date_gmt": Date;
  "wp:comment_content": string;
  "wp:comment_approved": string;
  "wp:comment_type": string;
  "wp:comment_parent": number;
  "wp:comment_user_id": number;
  "wp:commentmeta"?: Array<MetaXML>;
}

export interface PostOptions {
  path?: string;
  filename: string;
  template: string;
  statuses: Array<ItemStatus>;
}

export type ListOption = "commaSeparated" | "markdown";

export interface ConversionOptions {
  posts?: PostOptions;
  pages?: PostOptions;
  listOption: ListOption;
}

export default class WordPress {
  title: string;
  link: string;
  site_url: string;
  blog_url: string;
  authors: Array<Author>;
  categories: Array<Category>;
  tags: Array<Tag>;
  posts: Array<Post>;
  pages: Array<Page>;
  attachments: Array<Attachment>;
  static converter = new TurndownService();
  // private static _parser = new jsdom.JSDOM().window.document;
  static parser = window.document;
  conversionOptions: ConversionOptions;
  static get DefaultPostOptions(): PostOptions {
    return {
      path: "posts",
      filename: "{{slug}}.md",
      template: `---
title: "{{title}}"
slug: "{{slug}}"
date: "{{year}}-{{monthZeroPadded}}-{{dayZeroPadded}}T00:00:00.000Z"
template: "post"
draft: false
category: "{{category}}"
tags: {{tags}}
description: "{{description}}"
socialImage: "{{firstImage}}"
---

{{markdown}}`,
      statuses: ["publish"],
    };
  }
  static get DefaultPageOptions(): PostOptions {
    return {
      path: "posts",
      filename: "{{slug}}.md",
      template: `---
title: "{{title}}"
template: "page"
socialImage: {{firstImage}}
---

{{markdown}}`,
      statuses: ["publish"],
    };
  }
  static get DefaultConversionOptions(): ConversionOptions {
    return {
      posts: WordPress.DefaultPostOptions,
      listOption: "commaSeparated"
    };
  }
  get images(): Array<Attachment> {
    return this.attachments.filter(attachment => attachment.isImage);
  }

  constructor(wordpressExportXML: string) {
    let json: any;
    try {
      const obj = parser.getTraversalObj(wordpressExportXML);
      json = parser.convertToJson(obj, {});
    } catch (err) {
      const message = `Failed to parse XML: ${err.message}`;
      console.error(message);
      throw new Error(message);
    }
    const data = json.rss.channel as WordPressBlogXML;
    // Add authors
    this.authors = data["wp:author"]
      .map(authorXML => new Author(authorXML))
    // Add categories
    this.categories = data["wp:category"]
      .map(category => new Category(category))
    // Add tags
    this.tags = data["wp:tag"].map(tag => new Tag(tag));
    // Add posts
    this.posts = data.item
      .filter(item => item["wp:post_type"] === "post")
      .map(postXML => new Post(postXML, this));
    // Add pages
    this.pages = data.item
      .filter(item => item["wp:post_type"] === "page")
      .map(pageXML => new Post(pageXML, this));
    // Add attachments
    this.attachments = data.item
      .filter(item => item["wp:post_type"] === "attachment")
      .map(attachment => {
        return new Attachment(attachment);
      });
    // Add attachments and images to posts and pages
    this.posts.forEach(post => post.addAttachments(this));
    this.pages.forEach(page => page.addAttachments(this));
  }

  matchCategories(terms: string | Array<string>): Array<Category> {
    const categories: Array<Category> = [];
    if (typeof terms === "string") {
      const match = this.getCategory(terms);
      if (match) {
        categories.push(match);
      }
    } else {
      terms.forEach(term => {
        const match = this.getCategory(term);
        if (match) {
          categories.push(match);
        }
      });
    }
    return categories;
  }

  matchTags(terms: string | Array<string>): Array<Tag> {
    const tags: Array<Tag> = [];
    if (typeof terms === "string") {
      const match = this.getTag(terms);
      if (match) {
        tags.push(match);
      }
    } else {
      terms.forEach(term => {
        const match = this.getTag(term);
        if (match) {
          tags.push(match);
        }
      });
    }
    return tags;
  }

  getCategory(category: string): Category | null {
    const search = category.trim().toLowerCase();
    const match = this.categories.filter(
      category =>
        category.name.toLowerCase() === search ||
        category.slug.toLowerCase() === search
    );
    if (match.length > 0) {
      return match[0];
    }
    return null;
  }

  getTag(tag: string): Tag | null {
    const search = tag.trim().toLowerCase();
    const match = this.tags.filter(
      tag =>
        tag.name.toLowerCase() === search || tag.slug.toLowerCase() === search
    );
    if (match.length > 0) {
      return match[0];
    }
    return null;
  }

  authorByUsername(username: string): Author | null {
    const userMatches = this.authors.filter(
      author => author.username.toLowerCase() === username.trim().toLowerCase()
    );
    if (userMatches.length === 1) {
      return userMatches[0];
    }
    console.warn(`Author ${username} was not found.`);
    return null;
  }

  html2md(html: string): string {
    // // First, rebuild the html so we have properly formatted html
    // const template = document.createElement('template');
    // template.innerHTML = `<div>${html}</div>`;
    // const reformattedHTML = (template.content.firstChild as HTMLDivElement).innerHTML;

    // Get the markdown
    // let markdown = WordPress.converter.makeMarkdown(html, WordPress.parser);
    let markdown = WordPress.converter.turndown(html);
    // Fix some weird things the converter does
    markdown = markdown
      // Fix oddities with img and a tags
      .replace(/(\!?\[[^\]]*\]\([^\s\)]+)[^\)]*\)/g, "$1)")
    //   // Fix headings right after <!--more-->
    //   .replace(/\s#/, "\n\n#")
    return markdown;
  }

  async convert() {
    Post.listOption = this.conversionOptions.listOption;
    const zip = new JSZip();
    const addPost = (post: Post | Page, type: "posts" | "pages") => {
      // Don't add if we don't have a status from the configuration
      if (this.conversionOptions[type].statuses.indexOf(post.status) === -1) {
        console.log(
          "Post status does not match statuses in conversion options",
          post
        );
        return;
      }
      let folder: any;
      const filename = Handlebars.compile(this.conversionOptions[type].filename)(post);
      if (this.conversionOptions[type].path) {
        const path = Handlebars.compile(this.conversionOptions[type].path)(post);
        folder = zip.folder(path);
      } else {
        folder = zip;
      }
      const content = Handlebars.compile(this.conversionOptions[type].template)(post);
      folder.file(filename, content);
    };
    if (this.conversionOptions.posts) {
      this.posts.forEach(post => addPost(post.json, "posts"));
    }
    if (this.conversionOptions.pages) {
      this.pages.forEach(page => addPost(page.json, "pages"));
    }
    const content = await zip.generateAsync({ type: "blob" });
    await FileSaver.saveAs(content, "export.zip");
  }
}

export class Author {
  id: number;
  username: string;
  displayName: string;

  constructor(authorXML: AuthorXML) {
    this.id = authorXML["wp:author_id"];
    this.username = authorXML["wp:author_login"];
    this.displayName = authorXML["wp:author_display_name:"];
  }
}

export class Post {
  id: number;
  title: string;
  url: string;
  path: string;
  slug: string;
  author: Author;
  pubDate: Date;
  status: ItemStatus;
  description: string;
  html: string;
  markdown: string;
  categories?: Array<Category>;
  tags?: Array<Tag>;
  month: number;
  monthZeroPadded: string;
  monthName: string;
  monthShortName: string;
  day: number;
  dayZeroPadded: string;
  year: number;
  shortYear: string;
  static listOption: ListOption;
  private static _fullMonths = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  private static _shortMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  attachments: Array<Attachment> = [];
  images: Array<Image> = [];
  get firstImage(): Image | null {
    return this.images[0] ? this.images[0] : null;
  }

  constructor(postXML: ItemXML, blog: WordPress) {
    this.id = postXML["wp:post_id"];
    this.title = postXML.title;
    this.url = postXML.link;
    this.path = this.url.replace(/https?:\/\/[^\/]+/, "");
    this.slug = postXML["wp:post_name"];
    this.author = blog.authorByUsername(postXML["dc:creator"]);
    this.pubDate = new Date(postXML.pubDate);
    // If we have an invalid pubDate, use the post date instead
    if (isNaN(this.pubDate.getFullYear())) {
      this.pubDate = new Date(postXML["wp:post_date"]);
    }
    this.month = this.pubDate.getMonth() + 1;
    this.monthZeroPadded = ("0" + String(this.month)).slice(-2);
    this.monthName = Post._fullMonths[this.month - 1];
    this.monthShortName = Post._shortMonths[this.month - 1];
    this.day = this.pubDate.getDate();
    this.dayZeroPadded = ("0" + String(this.day)).slice(-2);
    this.year = this.pubDate.getFullYear();
    this.shortYear = String(2000 - this.year).slice(-2);
    this.status = postXML["wp:status"];
    this.html = postXML["content:encoded"].replace(/https?:\/\/[^\/]+\/wp-content/g,"");
    this.markdown = blog.html2md(this.html);
    this.description = postXML.description;
    // If there is no description, see if we have a <!--more--> tag in the html
    const split = this.html.split('<!--more-->');
    if (split.length > 1) {
      this.description = split[0].trim().replace(/<[^>]+>/g, '');
    }
    if (postXML.category) {
      const categories = blog.matchCategories(postXML.category);
      if (categories) {
        this.categories = categories;
      }
      const tags = blog.matchTags(postXML.category);
      if (tags) {
        this.tags = tags;
      }
    }
    this.addImages();
  }

  get json() {
    const json: any = {
      id: this.id,
      title: this.title,
      url: this.url,
      path: this.path,
      slug: this.slug,
      pubDate: this.pubDate,
      status: this.status,
      html: this.html,
      markdown: this.markdown,
      month: this.month,
      monthZeroPadded: this.monthZeroPadded,
      monthName: this.monthName,
      monthShortName: this.monthShortName,
      day: this.day,
      dayZeroPadded: this.dayZeroPadded,
      year: this.year,
      shortYear: this.shortYear,
      firstImage: (this.images.length > 0) ? this.images[0].newURL : '',
      firstImageMarkdown: (this.images.length > 0) ? this.images[0].markdown : '',
    };
    if (this.author) { json.author = this.author.displayName; }
    if (this.categories) {
      json.category = this.categories.map(category => category.name)[0];
      json.categories = this._arrayToString(
        this.categories.map(category => category.name)
      );
    }
    if (this.tags) {
      json.tags = this._arrayToString(this.tags.map(tag => tag.name));
    }
    return json;
  }

  private _arrayToString(array: Array<string>): string {
    // Return an empty string if there are no strings
    if (array.length === 0) {
      return "";
    }

    // Return the list of strings according to the options
    switch (Post.listOption) {
      case "markdown":
        return "\n  - " + array.join("\n  - ");
      case "commaSeparated":
        return array.join(", ");
    }
  }

  addAttachments(blog: WordPress) {
    // Do nothing if we already added attachments
    if (this.attachments.length > 0) {
      return;
    }

    this.attachments = blog.attachments.filter(
      attachment => attachment.postID === this.id
    );
  }

  addImages() {
    const imageTags = this.html.match(/<img[^>]+>/g);
    if (imageTags) {
      imageTags.forEach(imageTag => {
        const template = document.createElement('template');
        template.innerHTML = imageTag;
        const imageElement: HTMLImageElement = template.content.firstChild as HTMLImageElement;
        const url: string = imageElement.src;
        const newURL: string = url.replace(/https?:\/\/[^\/]+/, '');
        const alt: string = (imageElement.alt) ? imageElement.alt : (imageElement.title) ? imageElement.title : '';
        const title: string = (imageElement.title) ? imageElement.title : (imageElement.alt) ? imageElement.alt : '';
        const markdown: string = `![${alt}](newUrl "${title.replace(/"/g, '')}")`
        this.images.push({
          url, newURL, alt, title, markdown
        });
      });
    }
  }

  applyTemplate(template: string): string {
    return Handlebars.compile(template)(this);
  }
}

export class Page extends Post {}

export class Term {
  id: number;
  slug: string;
  name: string;

  constructor(termXML: TermXML | CategoryXML | TagXML) {
    this.id = termXML["wp:term_id"];
    if (termXML["wp:term_slug"]) {
      this.slug = termXML["wp:term_slug"];
      this.name = termXML["wp:term_name"];
    }
  }
}

export class Category extends Term {
  constructor(categoryXML: CategoryXML) {
    super(categoryXML);
    this.slug = categoryXML["wp:category_nicename"];
    this.name = categoryXML["wp:cat_name"];
  }
}

export class Tag extends Term {
  constructor(tagXML: TagXML) {
    super(tagXML);
    this.slug = tagXML["wp:tag_slug"];
    this.name = tagXML["wp:tag_name"];
  }
}

interface Image {
  url: string;
  newURL: string;
  markdown: string;
  alt?: string;
  title?: string;
}

export class Attachment {
  postID: number;
  url: string;
  newPath: string;
  filename: string;
  isImage: boolean;
  altText: string;
  markdown?: string;

  constructor(attachmentXML: ItemXML) {
    if (attachmentXML["wp:post_type"] !== "attachment") {
      console.error(
        "Attempted to create an attachment from a non-attachment post."
      );
      console.error("Post data:", attachmentXML);
      throw Error(
        `Attempted to create an attachment from a non-attachment post`
      );
    }
    this.postID = attachmentXML["wp:post_parent"];
    this.url = attachmentXML.guid;
    this.filename = this.url.replace(/^.*\/([^\/]+$)/, "$1");
    this.newPath = this.url
      .replace(/https?:\/\/[^\/]+\/wp-content/, "")
      .replace(`/${this.filename}`, "");
    this.altText = attachmentXML["excerpt:encoded"].replace(/"/g, "");
    const extensionMatch = this.filename.match(/\.([^\.]+)$/);
    if (!extensionMatch) {
      this.isImage = false;
    } else {
      const extension = extensionMatch[1].toLowerCase();
      this.isImage =
        ["jpg", "jpeg", "png", "gif", "svg", "bmp"].indexOf(extension) !== -1;
      if (this.isImage) {
        this.markdown = 
          `![${this.altText}](${this.newPath}/${this.filename} "${this.altText}")`;
      }
    }
  }
}