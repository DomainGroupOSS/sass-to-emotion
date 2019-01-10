/* eslint-disable no-template-curly-in-string */
module.exports = (params) => {
  // $breakpoints: (
  //   'mobile': 320px,
  //   'tablet': $fe-brary-global-tablet-min-width,
  //   'desktop': $fe-brary-global-desktop-min-width,
  //   'lrg-desktop': $fe-brary-global-desktop-max-width
  // );

  // $fe-brary-global-lrg-desktop-min-width: 1441px;
  // $fe-brary-global-desktop-max-width: 1440px;
  // $fe-brary-global-desktop-min-width: 1021px;
  // $fe-brary-global-tablet-max-width: 1020px;
  // $fe-brary-global-tablet-min-width: 624px;
  // $fe-brary-global-mobile-max-width: 623px;
  // $fe-brary-global-mobile-min-width: 0px;

  // https://github.com/eduardoboucas/include-media/blob/master/tests/parse-expression.scss

  switch (params) {
    case "media('>mobile')":
      return 'media(min-width: 321px)';
    case "media('>=mobile')":
      return 'media(min-width: 320px)';
    case "media('>tablet')":
      return 'media(min-width: ${vars.global.tabletMinWidth + 1})';
    case "media('>=tablet')":
      return 'media(min-width: ${vars.global.tabletMinWidth})';
    case "media('>desktop')":
      return 'media(min-width: ${vars.global.desktopMinWidth + 1})';
    case "media('>=desktop')":
      return 'media(min-width: ${vars.global.desktopMinWidth})';
    case "media('>lrg-desktop')":
      return 'media(min-width: ${vars.global.desktopMaxWidth + 1})';
    case "media('>=lrg-desktop')":
      return 'media(min-width: ${vars.global.desktopMaxWidth})';

    case "media('<mobile')":
      return 'media(max-width: 319px)';
    case "media('<=mobile')":
      return 'media(max-width: 320px)';
    case "media('<tablet')":
      return 'media(max-width: ${vars.global.tabletMinWidth - 1})';
    case "media('<=tablet')":
      return 'media(max-width: ${vars.global.tabletMinWidth})';
    case "media('<desktop')":
      return 'media(max-width: ${vars.global.desktopMinWidth - 1})';
    case "media('<=desktop')":
      return 'media(max-width: ${vars.global.desktopMinWidth})';
    case "media('<lrg-desktop')":
      return 'media(max-width: ${vars.global.desktopMaxWidth - 1})';
    case "media('<=lrg-desktop')":
      return 'media(max-width: ${vars.global.desktopMaxWidth})';
    default:
      throw new Error('Found an unrecognised `@include media(..)`, please change it to a vanilla CSS media query that uses fe-brary Sass vars then try this transformer again');
  }
};
