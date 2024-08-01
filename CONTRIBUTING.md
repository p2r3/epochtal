# Contributing to Epochtal

If you have an idea that could make Epochtal even better than it currently is, you are more than welcome to contribute
to the project. As a contributor, you'll need to follow the guidelines outlined in this document.

> [!NOTE]
> This document is far from completion, and currently only contains guidelines for documentation. Further contributing
> guidelines will be added later, so you should keep an eye out if you're planning to contribute.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and
"OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

## Language

All code and documentation MUST be written in English.
This includes, but is not limited to, variable and function names, code documentation, other files, GitHub issues,
and pull requests.

## Code style

Epochtal is set up to use [eslint](https://eslint.org/),
which will automatically complain if you do something really wrong.
If you don't know how to set up eslint,
read [this comment](https://github.com/p2r3/epochtal/pull/69#issuecomment-2254560934).
However, you should still keep the following in mind while coding:

- Curly brackets (`{}`) MUST NOT be omitted unless the associated statement is only a single line.
- Function declarations SHOULD have a space between the function name and the parenthesis (`()`).
- File import names MUST match the name of the file.
- Single ticks (`'`) MUST NOT be used unless absolutely necessary.
- Conditions that are split up between multiple lines SHOULD be formatted like this:
    ```js
    if (
        foo
        && bar
        && foobar
    ) {
        doSomething();
    }
    ```
- Casing:
  - Function and variable names MUST be written with `camelCase`.
  - Constants MUST be written with `UPPER_CASE_SNAKE_CASE`.
  - Class names MUST be written with `PascalCase`.

## Documentation

To ensure consistency throughout all code documentation, keep the following in mind as you are working on your
contribution:

- All classes, functions, and globally available fields (such as variables that handle core functionality) SHOULD be
documented following the [JSDoc](https://jsdoc.app/) standard.
- Function parameters and return values MUST be documented properly in their respective JSDoc blocks, if they exist.
Value types SHOULD also be documented (types are to be put in `{}`-blocks, see examples [here](https://jsdoc.app/tags-param)).
- Individual lines of text in JSDoc blocks SHOULD NOT exceed any reasonable length. This is to keep the documentation
easy to read, even in narrower code editors. There is no strict character limit, but basing your documentation style off
already existing documentation is recommended.
- Function and API endpoint documentation MUST be written in past tense, whereas utility documentation MUST be written
in present tense. This allows for easier discernment between the two.
- If code is authored by someone other than p2r3, the `@author` tag MUST be specified in the relevant JSDoc block.
- Inline code comments MUST have a space after the `//` before the comment text starts.
- All code MUST NOT be documented. JavaScript code is mostly self-explanatory, and not every single small algorithm
needs to be explained in detail. Code comments SHOULD be placed throughout code that impacts the overall functionality
of the application. Code comments SHOULD also be used for parts of the code that are hard to read, or in some other way
not immediately understandable.
- General comments or opinions about sections of code SHOULD NOT be communicated as code comments, and such conversations
would rather take place in a better suited communication channel (such as the Epochtal Discord server). If you still
find such a code comment to be necessary, it MUST be formatted like the following example:

```
// > This code clearly does not work, but I'm too lazy to fix it.
// > If anyone feels like fixing it, please extract the thousand-line-long `magic();` function
// > into multiple smaller functions.
// - Pancake
```

## Commit naming

To ensure the changelog is easy to read and understand, there's a few guidelines for how to name your commits:

- Commit names MUST be descriptive and clearly state what the commit does. For example, `Make the timer pink` is a good
commit name. `Change some timer stuff` would be a bad commit name for the same change.
- Commit names MUST start with a verb written in the simple future tense. An easy way to remember this is to always
make sure your commit name would make sense in the sentence `This commit will <commit message>`.
- You MAY use the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

## Additional notes

When submitting a contribution of any form to this project, you consent to the use of your work as described in the
project's license file. Once a contribution has been accepted, it is legally protected by said license, and will be
subject to the license terms. Make sure to know this before submitting any pull requests in order to save yourself from
any potential hassle in the future.

Remember that not all contributions will be accepted. Make sure your idea integrates well with the spirit of the project
if you want it to be approved. It is also a good idea to discuss your thoughts with others throughout your work, to get
some more varied opinions. When you feel satisfied with your contributions, submit them by opening a pull request. It's
likely that a project maintainer will request some minor changes to your code in order to fit the project better.

> [!TIP]
> To make it more likely for your code to be approved, try to match the code style of existing code in the project and
> follow these guidelines. Change requests are still somewhat to be expected; don't be discouraged if your PR is filled
> with them.
