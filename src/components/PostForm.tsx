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
  Select
} from "@material-ui/core";
import WordPress, { PostOptions, ListOption } from "../lib/wordpress";

interface PostFormProps {
  type: 'post'|'page'
  updated?: (convert: boolean, options: PostOptions) => any;
}

interface PostFormState {
  name: string;
  convert: boolean;
  options?: PostOptions;
}

export default class PostForm extends Component<PostFormProps, PostFormState> {
  state: PostFormState;
  name: 'Post'|'Page';
  constructor(props: PostFormProps) {
    super(props);
    this.state = this.defaultState;
    this.setConvert = this.setConvert.bind(this);
    this.updateOptions = this.updateOptions.bind(this);
  }

  get defaultState(): PostFormState {
    let convert: boolean;
    let name: 'Post'|'Page';
    let options: PostOptions;
    if (this.props.type === 'post') {
      name = 'Post';
      convert = true;
      options = WordPress.DefaultPostOptions;
    } else {
      name = 'Page';
      convert = false;
      options = WordPress.DefaultPageOptions;
      options.path = 'pages';
    }
    return {name, convert, options};
  }

  render() {
    return (
      <React.Fragment>
        <FormGroup row>
          <FormControlLabel
            control={
              <Checkbox
                checked={this.state.convert}
                onChange={event => this.setConvert(event)}
              />
            }
            label={`Enable ${this.state.name} Conversion`}
          />
        </FormGroup>
        {
          (this.state.convert)
            ?
            <React.Fragment>
              <FormGroup row>
                <TextField
                  label={`${this.state.name} Path`}
                  defaultValue={this.state.options.path}
                  onChange={event =>
                    this.updateOptions("path", event as React.ChangeEvent<HTMLInputElement>)
                  }
                  fullWidth
                />
              </FormGroup>
              <br />
              <FormGroup row>
                <TextField
                  label={`${this.state.name} Filename`}
                  defaultValue={this.state.options.filename}
                  onChange={event =>
                    this.updateOptions("filename", event as React.ChangeEvent<HTMLInputElement>)
                  }
                  required
                  fullWidth
                />
              </FormGroup>
              <br />
              <FormGroup row>
                <TextField
                  label={`${this.state.name} Template`}
                  defaultValue={this.state.options.template}
                  onChange={event =>
                    this.updateOptions("template", event as React.ChangeEvent<HTMLInputElement>)
                  }
                  required
                  multiline
                  fullWidth
                  className="Template"
                  style={{ fontFamily: '"Courier New", Courier, monospace' }}
                />
              </FormGroup>
              <br />              
            </React.Fragment>
            :
            null
        }
      </React.Fragment>
    )
  }

  async setConvert(event: React.ChangeEvent<HTMLInputElement>) {
    const enable = event.target.checked;
    let state = this.state;
    state.convert = enable;
    this.state.options = this.defaultState.options;
    await this.setState(state);
    this.update();
  }

  async updateOptions(
    option: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const state = this.state;
    const options = this.state.options;
    state.options = options;
    options[option] = event.target.value;
    await this.setState(state);
    this.update();
  }

  update() {
    if (this.props.updated) {
      this.props.updated(this.state.convert, this.state.options);
    }
  }
}