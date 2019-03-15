# sass-to-emotion

There are two parts to this repo, the Sass part and the JavaScript part.

### Sass

This contains most of the heavy lifting, give it a glob of .scss files, it will parse them into a
PostCSS AST and generate an Emotion JS file. To use, clone the repo and execute index.js like so:

```sh
../sass-to-emotion/index.js ./src/scss/**/*.scss
sass-to-emotion ./src/scss/**/*.scss
```

![Sass to JS example](https://media.giphy.com/media/82oklJW3X4lQx9show/giphy.gif)

#### Features

- Classes become exported Emotion tagged templates css\`\`.
- Nested classes get brought to the top level if they are not nested in an ampersand which could imply state
specific classes e.g `&.is-selected`.
- Sass vars not declared in the file are imported from a `../variables` file in the JS.
- Handles Sass vars in multi value situations `border-bottom: 1px solid $foo-bar-baz;`.
- Sass placeholders become css vars, `@extends`'s then references these vars using Emotion
[composition](https://emotion.sh/docs/composition).
- Sass mixins become functions, `@include`'s become function calls.
- Multi class selectors `.foo, .bar {}` become two exports and use composition.
- If multi class selectors are found `.foo.bar`, or a descendant combinator `.foo .bar`, it takes the last as precedence.
Could be a better way to do this?
- Merges decls of multiple class blocks of the same selector.
- If a class selector is referenced inside an & block tree e.g &::hover,
it leaves the CSS as is. It adds a FIXME comment above this class if it's also
referenced outside an & block.
- If a class, mixin or placeholder is not referenced in a file, it is exported, and vice versa.
- If only one export is generated in the file it will use a `export default`.
- Adds FIXME comment when Sass maths is detected so a developer can manually fix.
- Sass vars in rule blocks get moved to the root level and top of the JS file.
- Root level Sass comments become JS comments, comments in blocks stay as is.
- Warns in the CLI for files that need manual FIXME attention.
- Deletes `scss-lint` comments.
- Prettier is applied to the JS output.

##### Domain specific (OSS release coming soon)
- fe-brary global vars, mixins and placeholders are imported from fe-brary, if detected on it's export object.
- `@include media('>=desktop')` uses the new fe-brary#media helper which has the same arg,
it becomes `${media('>=desktop')}`
- Verbose `@media (min-width: $fe-brary-global-tablet-min-width)` media queries are modified to use the helper.

### JavaScript

The JS part uses [jscodeshift](https://github.com/facebook/jscodeshift).
Clone this repo and link to the transform at `sass-to-emotion/jscodeshift` when using the `jscodeshift` CLI.
For example:

```sh
yarn global add jscodeshift
jscodeshift --parser flow -t ../sass-to-emotion/jscodeshift.js ./src/js
```

![JS to Emotion example](https://media.giphy.com/media/2xFzMpZAxinybFs4im/giphy.gif)

Changes a BEM like classname from `className="baz-whizz__foo-bar"` to `css={styles.fooBar}` and adds the JS import.

#### Features

- Coverts single and multiple classes in `className`, e.g `className="foo"` and `className="foo bar"`.
- Searches the styles folder for a JS file that exports the correct export, only imports one styles file
`import * as styles`, so bare in mind the first one wins. Manual modifications may be required.

### Notes

- Think about detecting dep overrides
- Is taking the last in `.foo.bar` and `.foo .bar` smart
- Adding data-testid if class referenced in Enzyme/e2e tests
- Handle `classnames` package in jscodeshift
