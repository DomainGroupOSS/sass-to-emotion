const transform = require('./transform');

describe('transform', () => {
  beforeAll(() => {
    global.sassToEmotionWarnings = {};
  });

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
      transform(`
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
        }`),
    ).toMatchSnapshot();
  });

  it('mixin refrenced does not export', () => {
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

  it('mixin exported when not refrenced in file', () => {
    expect(
      transform(
        `@mixin ad-exact($width, $height) {
          width: $width;
          height: $height;
          color: $fe-brary-colour-primary-dark;
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

  it('mixin and placeholder', () => {
    expect(
      transform(`
        %fe-pa-listing__details-main {
          padding: 18px 0;
          flex: 1 1 auto;
          min-width: 0;
          width: 100%;
        }

        @mixin fe-pa-listing__details-container {
          color: black;
        }

        .fe-pa-listing__foo {
          @extend %fe-pa-listing__details-main;
          @include fe-pa-listing__details-container;
        }
      `),
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

  it('custom vars in include', () => {
    expect(
      transform(
        `.listing-details__map-marker {
            $map-marker-arrow-size: 8px;

            &::after {
              @include simple-arrow($map-marker-arrow-size, $map-marker-arrow-size, 'down', $fe-brary-colour-white);
              margin-left: $map-marker-arrow-size;
            }
          }`,
      ),
    ).toMatchSnapshot();
  });

  describe('pesudo elements/classes', () => {
    it('nested', () => {
      expect(
        transform(`
          .listing-details__button-copy {
            background: none;
            border: 0;

            &:focus,
            &:hover {
              outline: 0;
            }

            .domain-icon {
              width: 14px;
              height: 14px;
            }
          }
          `),
      ).toMatchSnapshot();
    });

    it('class nested in & adds FIXME comment', () => {
      expect(
        transform(`
          .listing-details__button-copy {
            display: flex;
            cursor: pointer;

            &:hover {
              .listing-details__button-icon {
                opacity: 1;
                transform: translateX(0);
              }
            }
          }

          .listing-details__button-icon {
            color: blue;
          }
          `),
      ).toMatchSnapshot();
    });

    it('nested pseudos are kept', () => {
      expect(
        transform(`
          .listing-details__additional-link {
            margin-left: auto;

            &:not(:last-of-type) {
              padding-right: 12px;

              &::after {
                height: 18px;
                content: '';
              }
            }
          }
        `),
      ).toMatchSnapshot();
    });

    it('top level pseudo classes', () => {
      expect(
        transform(`
          .listing-details__agent-details-right-arrow:first-of-type {
            color: black;
          }
        `),
      ).toMatchSnapshot();
    });
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
  });

  it('top level vars', () => {
    expect(
      transform(`
        $foo-bar-baz: 42px;
      `),
    ).toMatchSnapshot();
  });

  it('top level vars ref', () => {
    expect(
      transform(`
        $foo-bar-baz: 42px;

        .foo {
          height: $foo-bar-baz;
          width: $external-var;
        }
      `),
    ).toMatchSnapshot();
  });

  it('does not export placeholder if its being used in the file', () => {
    expect(
      transform(`
        %fe-pa-listing__details-main {
          padding: 18px 0;
          flex: 1 1 auto;
          min-width: 0;
          width: 100%;
        }

        .foo {
          @extend %fe-pa-listing__details-main;
        }
      `),
    ).toMatchSnapshot();
  });

  it('exports placeholder if its not being used in the file', () => {
    expect(
      transform(`
        %fe-pa-listing__details-main {
          padding: 18px 0;
          flex: 1 1 auto;
          min-width: 0;
          width: 100%;
        }

        .foo {
          color: pink;
        }
      `),
    ).toMatchSnapshot();
  });

  it('handles multi value var refrences', () => {
    expect(
      transform(`
        .foo {
          border-bottom: 1px solid $fe-brary-colour-neutral-300;
        }
      `),
    ).toMatchSnapshot();
  });


  it('imports fe-brary helpers with @extend', () => {
    expect(
      transform(`
        .listing-details__agent-details-right-arrow {
          @extend %button-normalize;
          color: $fe-brary-colour-primary-dark;
        }
        .another-ref {
          @extend %button-normalize;
        }
      `),
    ).toMatchSnapshot();
  });

  it('imports fe-brary helpers with @include', () => {
    expect(
      transform(`
        .listing-details__agent-details-right-arrow {
          @include %reset-top-margin;
          position: absolute;
        }
      `),
    ).toMatchSnapshot();
  });

  it('imports non-fe-brary helpers with @include', () => {
    expect(
      transform(`
        .listing-details__agent-details-right-arrow {
          @include %foo-bar;
          position: absolute;
        }
      `),
    ).toMatchSnapshot();
  });

  it('imports non-fe-brary helpers and vars', () => {
    expect(
      transform(`
        .listing-details__notes-container {
          @extend %fe-pa-listing-details-wrapper;

          margin-top: -54px;
        }
      `),
    ).toMatchSnapshot();
  });

  it('handle mixins without args', () => {
    expect(
      transform(`
        %message {
          @include reset-top-margin;
          margin-bottom: 20px;
        }

        @mixin reset-top-margin {
          > *:first-child {
            margin-top: 0;
          }
        }
      `),
    ).toMatchSnapshot();
  });

  it('default export for one only class', () => {
    expect(
      transform(`
        .listing-details__agent-details-agent {
          color: blue;
        }
      `),
    ).toMatchSnapshot();
  });

  it('default export for one only mixin', () => {
    expect(
      transform(`
        @mixin ad-exact($width, $height) {
          width: $width;
          height: $height;
        }
      `),
    ).toMatchSnapshot();
  });

  it('default export for one only placeholder', () => {
    expect(
      transform(`
        %message {
          margin-bottom: 20px;
        }
      `),
    ).toMatchSnapshot();
  });

  it('adds a FIXME comment', () => {
    expect(
      transform(`
        .leaderboard {
          height: 90px + $listing-details-ad-spacing * 2;
        }
      `),
    ).toMatchSnapshot();
  });

  it('no new line breaks', () => {
    expect(
      transform(`
        .listing-details__about-development {
          @extend %fe-pa-listing-details-wrapper;
          margin-bottom: 24px;
        }

        .listing-details__about-development-link {
          @extend %a-tag;
          position: static;
          cursor: pointer;
        }
      `),
    ).toMatchSnapshot();
  });

  it('never print nested ', () => {
    expect(
      transform(`
        .listing-details__about-development {
          @extend %fe-pa-listing-details-wrapper;
          margin-bottom: 24px;

          .listing-details__about-development-header {
            @extend %fe-pa-listing-details-heading;
            display: flex;
          }

          .listing-details__about-development-container {
            @extend %font-small;
            border: 1px solid $fe-brary-colour-neutral-300;
            display: flex;
            position: relative;
          }

          .listing-details__about-development-link {
            @extend %a-tag;
            position: static;
            cursor: pointer;

            &::before {
              cursor: pointer;
              bottom: 0;
              left: 0;
            }
          }
        }
      `),
    ).toMatchSnapshot();
  });

  it('never print nested media', () => {
    expect(
      transform(`
        .listing-details__additional-features {
          @extend %fe-pa-listing-details-wrapper;
          margin-bottom: 24px;

          @include media('>=mobile') {
            width: 80%;
          }

          .listing-details__additional-features-header {
            @extend %fe-pa-listing-details-heading;
          }

          .listing-details__additional-features-listing {
            list-style-type: none;

            @include media('>=tablet') {
              width: 33.33333%;
            }
          }
        }
      `),
    ).toMatchSnapshot();
  });

  it('multiple nested', () => {
    expect(
      transform(`
        .listing-details__about-development {
          @extend %fe-pa-listing-details-wrapper;
          margin-bottom: 24px;

          .listing-details__about-development-left {
            flex: 1;
            padding: 20px;

            .listing-details__about-development-name {
              font-size: $fe-brary-font-base-font-size;

              .listing-details__about-development-policy {
                font-size: 44px;
              }
            }
          }
        }
      `),
    ).toMatchSnapshot();
  });

  it('multiple vars formating', () => {
    expect(
      transform(`
        $agent-name-size: $fe-brary-font-h5-font-size;
        $company-name-size: $fe-brary-font-h6-font-size;
        $agent-avatar-border-experiment-color: #979797;

        .listing-details__agent-details-carousel {
          position: relative;
        }
      `),
    ).toMatchSnapshot();
  });

  it('vars referencing fe-brary variables', () => {
    expect(
      transform(`
        $agent-name-size: $fe-brary-font-h5-font-size;
        $foo-bar: $foo-bar-baz;
        $agent-box-box-shadow-left-right: inset -1px 0 0 0 $agent-box-border-color-lighter, inset 1px 0 0 0 $agent-box-border-color-light;
        $agent-avatar-border-experiment-color: #979797;
      `),
    ).toMatchSnapshot();
  });

  it('const vars up top', () => {
    expect(
      transform(`
        .listing-details__agent-details-carousel {
          position: relative;
        }

        $agent-avatar-border-experiment-color: #979797;
      `),
    ).toMatchSnapshot();
  });

  it('nested with state', () => {
    expect(
      transform(`
        .listing-details__agent-details-carousel {
          position: relative;

          .foo-bar-baz {
            &.bazzy {
              color: pink;
            }
          }
        }
      `),
    ).toMatchSnapshot();
  });

  it('selector for multiple classes', () => {
    expect(
      transform(`
        .foo__bar-whizz,
        .foo__whizz-bar {
          color: pink;
        }
      `),
    ).toMatchSnapshot();
  });

  it('nested selector for multiple classes', () => {
    expect(
      transform(`
        .bar {
          color: red;

          .foo__bar-whizz,
          .foo__whizz-bar {
            color: pink;
          }
        }
      `),
    ).toMatchSnapshot();
  });

  it('selector for multiple classes with existing at top level', () => {
    expect(
      transform(`
          .listing-details__key-features--key,
          .listing-details__key-features--value {
            width: 50%;
          }

          .listing-details__key-features--key {
            @include media('>=desktop') {
              padding-right: 25px;
              font-weight: 600;
            }
          }
        `),
    ).toMatchSnapshot();
  });


  it('locate multi comma rule composition ref just after shared css', () => {
    expect(
      transform(`
          .bar {
            display: block;
          }

          .listing-details__agent-details-left-arrow,
          .listing-details__agent-details-right-arrow {
            @extend %button-normalize;
            position: absolute;
            bottom: 6px;
            cursor: pointer;

            &.experiment-enabled {
              color: $arrow-color;
              bottom: 42px;
              right: 20px;
            }
          }

          .foo {
            display: block;
          }
        `),
    ).toMatchSnapshot();
  });

  it('selector for an element with multiple classes', () => {
    expect(
      transform(`
          .bar {
            color: purple;
          }

          .foo__bar-baz.foo__whizz-bar {
            color: pink;
          }
        `),
    ).toMatchSnapshot();
  });

  it('delete scss lint comments', () => {
    expect(
      transform(`
        .foo {
          // scss-lint:disable NestingDepth
          font-size: 68%; // scss-lint:disable VariableForProperty
          // scss-lint:enable NestingDepth
        }
        `),
    ).toMatchSnapshot();
  });

  it('handles nested vars', () => {
    expect(
      transform(`
        .listing-details__agent-details-agent-avatar {
            $avatar-size: 72px;
            color: $avatar-size;
          }
        `),
    ).toMatchSnapshot();
  });

  it('handles non-nested vars', () => {
    expect(
      transform(`
        $avatar-size: 72px;
        .listing-details__agent-details-agent-avatar {
            color: $avatar-size;
          }
        `),
    ).toMatchSnapshot();
  });

  it('merges decls of multiple class blocks of same selector', () => {
    expect(
      transform(`
        .foo {
          color: pink;

          .listing-details__agent-details-agent-avatar {
            color: black;

            &.experiment-enabled {
              border-color: $agent-avatar-border-experiment-color;
              width: 72px;
              height: 72px;
            }
          }
        }

        .listing-details__agent-details-agent-avatar {
          display: flex;
        }
      `),
    ).toMatchSnapshot();
  });

  it('spaced selectors', () => {
    expect(
      transform(`
        .listing-details__agent-details {
          background-color: $agent-box-background-color;

          .carousel .fe-carousel_forward {
            width: 50px;
            background: none;
          }
        }
      `),
    ).toMatchSnapshot();
  });

  it('double spaced selectors', () => {
    expect(
      transform(`
        .listing-details__agent-details {
          background-color: $agent-box-background-color;

          .carousel .fe-carousel_backwards,
          .carousel .fe-carousel_forward {
            width: 50px;
            background: none;
          }
        }
      `),
    ).toMatchSnapshot();
  });

  it('print all contents of placeholders', () => {
    expect(
      transform(`
        %search-results__remove-ad-border {
          .adspot__inner iframe {
            // The ad brings in a border that we want to forcibly remove
            border: none !important; // scss-lint:disable ImportantRule
          }
        }

        .adspot-300x25-pos-1-container {
          @extend %search-results__remove-ad-border;
        }
      `),
    ).toMatchSnapshot();
  });

  it('media query vars', () => {
    expect(
      transform(`
        .foo {
          @media (min-width: $fe-brary-global-tablet-min-width) {
            display: block;
          }
          @media (max-width: $fe-brary-global-lrg-desktop-min-width) {
            display: block;
          }
          @media (min-width: $tablet-min-width) {
            display: block;
          }
          @media (max-width: $lrg-desktop-min-width) {
            display: block;
          }
        }
      `),
    ).toMatchSnapshot();
  });

  it('media query with sass vars', () => {
    expect(
      transform(`
        .foo {
          @media (min-width: $foo-bar-baz) {
            display: block;
          }
          @media (min-width: $fe-brary-global-desktop-max-width) {
            display: block;
          }
        }
      `),
    ).toMatchSnapshot();
  });

  it('adjactent sibling selectors', () => {
    expect(
      transform(`
        .search-results__save-search-summary-item {
          display: inline;
          color: $fe-brary-colour-neutral-500;

          &.is-mode {
            font-weight: bold;
          }

          + .search-results__save-search-summary-item::before {
            content: 'foo';
            margin: 0 6px;
          }
        }
      `),
    ).toMatchSnapshot();
  });

  it('dont lose top level comments', () => {
    expect(
      transform(`
        /*
          I wondered why the baseball was getting bigger,
          and then it hit me.
         */
        .bar {
          color: pink;
        }

        // foo bar baz
        // skeleton washing his hair
        // bear washing clothes
        .foo {
          color: black;
        }
      `),
    ).toMatchSnapshot();
  });

  it.skip('pseduo elements and combinators', () => {
    expect(
      transform(`
        .search-results__featured-properties > .adspot_300x50_pos-4-container:only-child {
          margin-bottom: 0;
        }
      `),
    ).toMatchSnapshot();
  });

  it.skip('math in media query vars', () => {
    expect(
      transform(`
        @media (
          min-width: $search-results-max-sidebar-width + $search-results-max-main-width + (2 * $search-results-gutter)
        ) {
          padding-left: 0;
        }
      `),
    ).toMatchSnapshot();
  });

  it.skip('keyframes', () => {
    expect(
      transform(`
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(250px);
          }

          30% {
            opacity: 0;
          }

          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `),
    ).toMatchSnapshot();
  });
});
