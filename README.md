# sass-to-emotion

There are two parts to this repo, the Sass part and the JavaScript part.

### Sass

Give it a glob of .scss files, it will create a bunch of Emotion js files.

```sh
yarn global add sass-to-emotion
sass-to-emotion ./src/scss/**/*.scss
```

### JavaScript

The JS part uses [jscodeshift](https://github.com/facebook/jscodeshift). Clone this repo and link to the transform at `sass-to-emotion/jscodeshift` when using the `jscodeshift` CLI. For example:

```sh
jscodeshift --parser flow -t ../sass-to-emotion/jscodeshift.js ./src/js
```

For example *src/js/components/ads/ad-spot-boilerplate.js* will add a `import styles from '../../../components/ads/ad-spot-boilerplate.js'` and change a BEM like classname from `className="baz-whizz__foo-bar"` to `className={styles.fooBar}`.
