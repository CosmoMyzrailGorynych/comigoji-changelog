#!/usr/bin/env node

const path = require('path');
const gitlog = require('gitlog');

const defaultOptions = {
    number: 100500,
    nameStatus: false,
    fields: [
        'subject',
        'body'
    ],
    branch: 'develop',
    execOptions: {
        maxBuffer: 1000 * 1024
    }
};
const defaultCategories = {
    rollback: {
        pattern: /^:(roller_coaster|rewind):/,
        header: '### 🎢 Rollbacked'
    },
    feature: {
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
    assets: {
        pattern: /^:(briefcase|bento):/,
        header: '### 🍱 Demos and Stuff'
    },
    docs: {
        pattern: /^:(books|pencil|pencil2|memo):/,
        header: '### 📝 Docs'
    },
    default: {
        header: '### 👽 Misc'
    },
    ignore: {
        pattern: /^:(construction|doughnut|rocket|bookmark):/,
        skip: true
    }
};

const makeChangelog = function(request) {
    const categories = request.categories || defaultCategories;
    categories.default = categories.default || {
        ignore: true
    };
    const gitlogPromises = request.repos.map(repo =>
        new Promise((resolve, reject) => {
            gitlog(Object.assign({}, defaultOptions, repo), function (error, commits) {
                if (error) {
                    reject(error);
                }
                resolve(commits);
            });
        })
        .then(commits => {
            // Commits from particular repos may belong to a separate changelog category
            if (repo.forceCategory) {
                commits.forEach(commit => {
                    commit.category = repo.forceCategory;
                    // Strip unnecessary prefixes that are considered as default in certain changelog categories
                    commit.subject = commit.subject.replace(repo.forceCategoryStrip, '');
                });
            }
            return commits;
        })
        );

        Promise.all(gitlogPromises)
        .then(repoCommits => [].concat(...repoCommits)) // Flatten array
        .then(commits => {
            const sorted = {};
            for (const category in categories) {
                sorted[category] = [];
            }
            commits.forEach(commit => {
                if (commit.category) {
                    // this one has a category pre-set already
                    if (!sorted[commit.category].find(commit2 => commit2.subject === commit.subject)) {
                        sorted[commit.category].push(commit);
                    }
                    return;
                }
                // put commits into categories
                for (const category in categories) {
                    const cat = categories[category];
                    if (cat.pattern && (
                        typeof cat.pattern === 'string'? // expect it to be either a string or a regexp
                        commit.subject.indexOf(cat.pattern) === 0 :
                        cat.pattern.test(commit.subject)
                    )) {
                        // skip duplicates
                        if (!sorted[category].find(commit2 => commit2.subject.trim() === commit.subject.trim())) {
                            // trim the prefix
                            commit.subject = commit.subject.replace(cat.pattern, '').trim();
                        sorted[category].push(commit);
                    }
                    return;
                }
            }
            // skip duplicates and put the remaining commits into a default directory
            if (!sorted.default.find(commit2 => commit2.subject === commit.subject)) {
                sorted.default.push(commit);
            }
        });
        for (const category in categories) {
            sorted[category].sort((a, b) => a.subject.localeCompare(b.subject));
        }
        return sorted;
    })
    .then(sorted => {
        process.stdout.write(`*${(new Date()).toDateString()}*\n\n`);
        for (const cname in sorted) {
            if (categories[cname].skip || !sorted[cname].length) {
                continue;
            }
            process.stdout.write(`${categories[cname].header || cname}\n\n`);
            for (const entry of sorted[cname]) {
                process.stdout.write(`* ${entry.subject}`);
                if (entry.body) {
                    // pad each line
                    process.stdout.write('\n  ' + entry.body.replace(/\n/g, '\n  ').trim());
                }
                process.stdout.write('\n');
            }
            process.stdout.write('\n');
        }
    })
    .catch(error => {throw error;});
};

if (process.argv.length < 3) {
    throw new Error('You must provide a path for a comigojiChangelog.json or comigojiChangelog.js file.');
}

var request = require(path.resolve(process.cwd(), process.argv.slice(2, 3)[0]));
if (request instanceof Promise) {
    request.then(data => {
        request = data;
        makeChangelog(request);
    });
} else {
    makeChangelog(request);
}
