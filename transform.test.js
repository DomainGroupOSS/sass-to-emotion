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
          display: inline-flex;
          align-items: center;
          justify-content: center;

          .foo {
            ddddd: black;
          }
        }`,
      ),
    ).toMatchSnapshot();
  });
});
