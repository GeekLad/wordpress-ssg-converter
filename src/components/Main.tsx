import React, { Component } from "react";
import {
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TextField,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from "@material-ui/core";
import FileReaderInput from "react-file-reader-input";
import WordPress, { PostOptions, ConversionOptions, ListOption } from "../lib/wordpress";
import PostForm from './PostForm';

interface ConverterState {
  converting: boolean;
  convertPosts: boolean;
  postOptions?: PostOptions;
  convertPages: boolean;
  pageOptions?: PostOptions;
  listOption: ListOption;
}

export class Main extends Component<{}, ConverterState> {
  state: ConverterState;
  constructor() {
    super({});
    this.state = {
      converting: false,
      convertPosts: true,
      postOptions: WordPress.DefaultPostOptions,
      convertPages: false,
      pageOptions: WordPress.DefaultPageOptions,
      listOption: 'markdown'
    };
    this.setListOption = this.setListOption.bind(this);
    this.updatePost = this.updatePost.bind(this);
    this.import = this.import.bind(this);
  }

  render() {
    return (
      <div className="Main">
        <div style={{ display: this.state.converting ? "block" : "none" }}>
          <LinearProgress />
          Converting, please wait...
        </div>
        <form style={{ display: this.state.converting ? "none" : "block" }}>
          <FormControl>
            <InputLabel>List Display</InputLabel>
            <Select
              defaultValue={this.state.listOption}
              onChange={this.setListOption}
            >
              <MenuItem value={'markdown'}>Markdown</MenuItem>
              <MenuItem value={'commaSeparated'}>Comma Separated</MenuItem>
            </Select>
            <FormHelperText>For displaying categories and tags</FormHelperText>
          </FormControl>
          <p></p>
          <PostForm type="post" updated={(convert, options) => this.updatePost('post', convert, options)} />
          <PostForm type="page" updated={(convert, options) => this.updatePost('page', convert, options)} />
          <FormGroup row>
            <FileReaderInput
              accept="text/xml"
              style={{ display: "none" }}
              id="wordpress-import"
              multiple
              type="file"
              onChange={this.import}
            />
            <label htmlFor="wordpress-import">
              <Button
                variant="contained"
                component="span"
                disabled={!this.state.convertPosts && !this.state.convertPages}
              >
                Convert
              </Button>
            </label>
          </FormGroup>
        </form>
      </div>
    );
  }

  setListOption(event: React.ChangeEvent<{ value: ListOption }>) {
    const state = this.state;
    state.listOption = event.target.value;
    this.setState(state);
  }

  updatePost(type: 'post'|'page', convert: boolean, options: PostOptions) {
    let state = this.state;
    switch(type) {
      case 'post':
        state.convertPosts = convert;
        state.postOptions = options;
        break;
      case 'page':
        state.convertPages = convert;
        state.pageOptions = options;
        break;
    }
    this.setState(state);
  }

  async import(e, results) {
    this.setState({
      ...this.state,
      converting: true
    });
    if (results.length > 0) {
      const file = results[0][1];
      const contents = await file.text();
      const wp = new WordPress(contents);
      const convertOptions: ConversionOptions = {
        listOption: this.state.listOption
      };
      if (this.state.convertPosts) {
        convertOptions.posts = this.state.postOptions;
      }
      if (this.state.convertPages) {
        convertOptions.pages = this.state.pageOptions;
      }
      wp.conversionOptions = convertOptions;
      console.log("options", convertOptions);
      await wp.convert();
    }
    this.setState({
      ...this.state,
      converting: false
    });
  }
}
