const transform = require('./transform');

describe('transform', () => {
  it('simple class no vars', async () => {
    expect(
      await transform(
        `.button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }`,
      ),
    ).toMatchSnapshot();
  });

  it('nested class no vars', async () => {
    expect(
      await transform(
        `.button {
          display: flex;
          align-items: center;
          justify-content: center;

          .foo {
            display: block;
          }
        }`,
      ),
    ).toMatchSnapshot();
  });

  it('sass vars to import', async () => {
    expect(
      await transform(
        `.button {
          color: $fe-brary-colour-primary-dark;

          .bar {
            font-size: $fe-brary-font-h6-font-size;
          }
        }`,
      ),
    ).toMatchSnapshot();
  });

  it('placeholder', async () => {
    expect(
      await transform(
        `%message-shared {
          border: 1px solid #ccc;
          padding: 10px;
          color: #333;
        }

        .message {
          @extend %message-shared;
        }

        .success {
          @extend %message-shared;
          border-color: green;
        }`,
      ),
    ).toMatchSnapshot();
  });

  it('mixins', async () => {
    expect(
      await transform(
        `@mixin ad-exact($width, $height) {
          width: $width;
          height: $height;
        }

        .bar {
          color: blue;
          @include ad-exact(125px, 700px);
        }`,
      ),
    ).toMatchSnapshot();
  });
});
