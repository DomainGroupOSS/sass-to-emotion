# sass-to-emotion

There are two parts to this repo, the Sass part and the JavaScript part.

### Sass

Give it a glob of .scss files, it will create a bunch of Emotion js files.

```sh
yarn global add sass-to-emotion
sass-to-emotion ./src/scss/**/*.scss
```

![Sass to JS example](https://media.giphy.com/media/82oklJW3X4lQx9show/giphy.gif)

### JavaScript

The JS part uses [jscodeshift](https://github.com/facebook/jscodeshift). Clone this repo and link to the transform at `sass-to-emotion/jscodeshift` when using the `jscodeshift` CLI. For example:

```sh
yarn global add jscodeshift
jscodeshift --parser flow -t ../sass-to-emotion/jscodeshift.js ./src/js
```

![JS to Emotion example](https://media.giphy.com/media/2xFzMpZAxinybFs4im/giphy.gif)

For example *src/js/components/ads/ad-spot-boilerplate.js* will add a `import styles from '../../../components/ads/ad-spot-boilerplate.js'` and change a BEM like classname from `className="baz-whizz__foo-bar"` to `className={styles.fooBar}`.
