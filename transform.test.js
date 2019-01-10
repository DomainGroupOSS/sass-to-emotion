const transform = require('./transform');

describe('transform', () => {
  it('simple class no vars', () => {
    expect(
      transform(
        `.button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }`,
      ),
    ).toMatchSnapshot();
  });

  it('nested class no vars', () => {
    expect(
      transform(
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

  it('sass vars to import', () => {
    expect(
      transform(
        `.button {
          color: $fe-brary-colour-primary-dark;
          display: flex;

          .bar {
            font-size: $fe-brary-font-h6-font-size;
          }
        }`,
      ),
    ).toMatchSnapshot();
  });

  it('placeholder', () => {
    expect(
      transform(
        `// this comment would cause issues using the postcss parser vs postcss-scss
        %message-shared {
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

  it('mixins', () => {
    expect(
      transform(
        `@mixin ad-exact($width, $height) {
          width: $width;
          height: $height;
          color: $fe-brary-colour-primary-dark;
        }

        .adspot-468x60_728x90-pos-1-container {
          color: blue;
          @include ad-exact(125px, 700px);
        }`,
      ),
    ).toMatchSnapshot();
  });

  it('mixins nested', () => {
    expect(
      transform(
        `@mixin ad-exact($width, $height) {
          width: $width;
          height: $height;

          .bar {
            color: $fe-brary-colour-primary-dark;
            display: flex;
            align-items: center;

            .foo {
              display: black;
              align-items: start;
            }
          }

          display: block;
        }`,
      ),
    ).toMatchSnapshot();
  });


  it('non classname', () => {
    expect(
      transform(
        `.listing-details__description {
            margin-bottom: 24px;

            ::hover {
              color: pink;
            }

            .foo {
              margin-bottom: 100px;
            }

            p {
              margin-bottom: 55px;
            }
          }`,
      ),
    ).toMatchSnapshot();
  });

  it('vanilla css media query', () => {
    expect(
      transform(
        `.search-results__auctions-label {
           display: none;

           @media(min-width: 100px) {
             display: inline;
           }
        }`,
      ),
    ).toMatchSnapshot();
  });

  it('custom vars', () => {
    expect(
      transform(
        `.search-results__auctions-label {
           display: none;
           color: $foo-bar-baz-whizz;
        }`,
      ),
    ).toMatchSnapshot();
  });

  describe('custom include-media', () => {
    it('min-width', () => {
      expect(
        transform(
          `.search-results__auctions-label {
             display: none;

             @include media('>=desktop') {
               display: inline;
             }
          }`,
        ),
      ).toMatchSnapshot();
    });
    it('max-width', () => {
      expect(
        transform(
          `.search-results__auctions-label {
             display: none;

             @include media('<desktop') {
               display: inline;
             }
          }`,
        ),
      ).toMatchSnapshot();
    });
    it('unrecognised', () => {
      expect(
        () => {
          transform(
            `.search-results__auctions-label {
             display: none;

             @include media('>=desktop', 'landscape') {
               display: inline;
             }
          }`,
          );
        },
      ).toThrow();
    });
  });
});
