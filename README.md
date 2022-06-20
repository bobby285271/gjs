JavaScript bindings for GNOME
=============================

Use the GNOME platform libraries in your JavaScript programs.
GJS powers GNOME Shell, Polari, GNOME Documents, and many other apps.
Under the hood it uses SpiderMonkey, Mozilla's JavaScript engine
originally developed for Firefox.

## Installation

Available as part of your GNOME distribution by default.
In most package managers the package will be called `gjs`.

## Usage

GJS includes a command-line interpreter, usually installed in
`/usr/bin/gjs`.
Type `gjs` to start it and test out your JavaScript statements
interactively.
Hit Ctrl+D to exit.

`gjs filename.js` runs a whole program.
`gjs -d filename.js` does that and starts a debugger as well.

There are also facilities for generating code coverage reports.
Type `gjs --help` for more information.

`-d` only available in gjs >= 1.53.90

## Contributing

For instructions on how to get started contributing to GJS, please read
the contributing guide,
<https://gitlab.gnome.org/GNOME/gjs/blob/HEAD/CONTRIBUTING.md>.

## History

GJS probably started in August 2008 with [this blog post][havocp] and
[this experimental code][gscript].
GJS in its current form was first developed in October 2008 at a company
called litl, for their [litl webbook] product.
It was soon adopted as the basis of [GNOME Shell]'s UI code and
extensions system and debuted as a fundamental component of GNOME 3.0.

In February 2013 at the GNOME Developer Experience Hackfest GJS was
declared the ['first among equals'][treitter] of languages for GNOME
application development.
That proved controversial for many, and was later abandoned.

At the time of writing (2018) GJS is used in many systems including
Endless OS's [framework for offline content][eos-knowledge-lib] and, as
a forked version, [Cinnamon].

## Reading material

### Documentation

* [Get started](https://gitlab.gnome.org/GNOME/gjs/blob/HEAD/CONTRIBUTING.md)
* [Get started - Internship](https://gitlab.gnome.org/GNOME/gjs/blob/HEAD/doc/Internship-Getting-Started.md)
* [API documentation](https://gjs-docs.gnome.org/)

### JavaScript & SpiderMonkey

* https://github.com/spidermonkey-embedders/spidermonkey-embedding-examples

### GNOME Contribution

* https://wiki.gnome.org/GitLab
* https://wiki.gnome.org/Newcomers/

## License

Dual licensed under LGPL 2.0+ and MIT.

## Thanks ##

The form of this README was inspired by [Nadia Odunayo][hospitable] on
the Greater Than Code podcast.
