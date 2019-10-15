Not fully tested, but should work.

# Comigoji Changelog

This CLI app is designed to generate changelogs for one or more repos at once. By default, repos should convey to [Comigoji commit message guidelines](), and can use both Vanilla and Gitmoji-like flavors out-of-the-box. This can be configured, though, and be applicable to other commit message guidelines as long as they have distinct prefixes in their subjects.

## Usage

```js
// yourProject/comigojiChangelog.js
// Can also be a static .json file

const since = new Date('2019-09-25T10:15:11+12:00');
module.exports = {
    repos: [{
        since,
        repo: './repo1',
        branch: 'develop'
    }, {
        since,
        repo: '/home/user/repo2',
        branch: 'master'
    }]
};
```

```sh
npm install -g comigoji-changelog
comigoji-changelog ./comigojiChangelog.js > Changelog.md
```

Note that this changelog tool does not choose by itself the point from which to write the changelog. If `since` parameter is not specified for each repo, then it will fetch all the commits in these repositories. As you can use a .js file as an input, you can perform any computations before generating a changelog, be they synchronous or not. An example that gets a latest tag's date from one repository and applies it to other ones:

```js
// yourProject/comigojiChangelog.js
// This gets a datetime string of the latest tagged commit
const gitCommand = 'git log --max-count=1 --tags --simplify-by-decoration --pretty="format:%cI"';
const {exec} = require('child_process');

module.exports = new Promise((resolve, reject) => {
    // assuming that the current working directory is a git repo with relevant tags
    exec(gitCommand, function (err, stdout, stderr) {
        if (err) {
            reject(err);
            return;
        }
        if (stderr) {
            reject(new Error(stderr));
            return;
        }
        const since = new Date(stdout.trim());
        resolve({
            repos: [{
                since,
                repo: './',
                branch: 'develop'
            }, {
                since,
                repo: '/home/user/repo2',
                branch: 'master'
            }]
        });
    });
});
```

## Defining your own categories

```js
module.exports = {
    repos: [/* … */],
    categories: {
        // generic categories
        feature: {
            // should be a regexp or a string
            pattern: /^:(rainbow|sparkles):/,
            header: '### ✨ New Features'
        },
        improvement: {
            pattern: /^:(zap|wrench):/,
            header: '### ⚡️ General Improvements'
        },
        bug: {
            pattern: /^:bug:/,
            header: '### 🐛 Bug Fixes'
        },
        /* … */
        default: {
            // If you want strangely named commits to appear in the changelog, this section (`default`) should be present
            header: `### 👽 Misc`
        },
        ignore: {
            pattern: /^:(construction|doughnut|rocket|bookmark):/,
            skip: true // this makes specific commits to be ignored
        }
    }
};
```

## Autocategories for doc sites, website updates, etc.

Certain repos may be configured so that their commits are automatically put into specific categories.

```js
module.exports = {
    repos: [{
        repo: './docs',
        branch: 'master',
        forceCategory: 'docs',
        // Doc commits usually contain the 📝 symbol, which is already used in a header.
        // The line below will clean up these symbols.
        forceCategoryStrip: /^:(books|pencil|pencil2|memo):/
    }, {
        repo: './website',
        branch: 'master',
        // this repo's commit subjects will be written as is
        forceCategory: 'website'
    }],
    categories: {
        /* … */
        docs: {
            pattern: /^:(books|pencil|pencil2|memo):/,
            header: '### 📝 Docs'
        },
        website: {
            header: '### 🌐 Website'
        }
    }
};
```