(this document is far from completion. currently it only contains guidelines for documentation)

# Documentation
Please note that the following rules are not strict, but just general recommendations. This document may be updated in the future, so keep an eye out.

- Specify potential types of arguments and return values in the js docstrings.
- Follow the format of existing utility and api files, to maintain consistency.
- Write method documentation and api endpoint documentation in past tense, but utility documentation in present tense. This is to allow for easier discernment between the two.
- If code is authored by someone other than p2r3, add the `@author` tag into the jsdoc.
- DO NOT DOCUMENT EVERY SINGLE TINY DETAIL. JavaScript code is mostly self-explanatory, and not every single small algorithm needs to be explained in detail. Document parts that have impact on the overall functionality of the code.
- While user comments are usually discouraged and prefered to be shared on the discord server, if you feel like a comment is necessary, format it like this:
```
// > This code clearly does not work, but I'm too lazy to fix it.
// > If anyone feels like fixing it, please extract the thousand-line-long `magic();` function into multiple smaller functions.
// - Pancake
```
- Request changes are expected, don't be discouraged if your PR is filled with them.
