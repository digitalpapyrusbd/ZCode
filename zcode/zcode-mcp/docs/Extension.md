Developing Extensions
Zed extensions are Git repositories containing an extension.toml manifest. They can provide languages, themes, debuggers, slash commands, and MCP servers.

Extension Features
Extensions can provide:

Languages
Debuggers
Themes
Icon Themes
Slash Commands
MCP Servers
Developing an Extension Locally
Before starting to develop an extension for Zed, be sure to install Rust via rustup.

Rust must be installed via rustup. If you have Rust installed via homebrew or otherwise, installing dev extensions will not work.

When developing an extension, you can use it in Zed without needing to publish it by installing it as a dev extension.

From the extensions page, click the Install Dev Extension button (or the zed: install dev extension action) and select the directory containing your extension.

If you need to troubleshoot, check Zed.log (zed: open log) for additional output. For debug output, close and relaunch Zed from the command line with zed --foreground, which shows more verbose INFO-level logs.

If you already have the published version of the extension installed, the published version will be uninstalled prior to the installation of the dev extension. After successful installation, the Extensions page will indicate that the upstream extension is "Overridden by dev extension".

Directory Structure of a Zed Extension
A Zed extension is a Git repository that contains an extension.toml. This file must contain some basic information about the extension:

id = "my-extension"
name = "My extension"
version = "0.0.1"
schema_version = 1
authors = ["Your Name <you@example.com>"]
description = "Example extension"
repository = "https://github.com/your-name/my-zed-extension"
Note: If you are working on a theme extension with the intent to publish it later, suffix your theme extension ID with -theme. Otherwise, this may be raised during extension publishing.

In addition to this, there are several other optional files and directories that can be used to add functionality to a Zed extension. An example directory structure of an extension that provides all capabilities is as follows:

my-extension/
  extension.toml
  Cargo.toml
  src/
    lib.rs
  languages/
    my-language/
      config.toml
      highlights.scm
  themes/
    my-theme.json
WebAssembly
Procedural parts of extensions are written in Rust and compiled to WebAssembly. To develop an extension that includes custom code, include a Cargo.toml like this:

[package]
name = "my-extension"
version = "0.0.1"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
zed_extension_api = "0.1.0"
Use the latest version of the zed_extension_api available on crates.io. Make sure it's still compatible with Zed versions you want to support.

In the src/lib.rs file in your Rust crate you will need to define a struct for your extension and implement the Extension trait, as well as use the register_extension! macro to register your extension:

use zed_extension_api as zed;

struct MyExtension {
    // ... state
}

impl zed::Extension for MyExtension {
    // ...
}

zed::register_extension!(MyExtension);
stdout/stderr is forwarded directly to the Zed process. In order to see println!/dbg! output from your extension, you can start Zed in your terminal with a --foreground flag.

Forking and cloning the repo
Fork the repo
Note: It is very helpful if you fork the zed-industries/extensions repo to a personal GitHub account instead of a GitHub organization, as this allows Zed staff to push any needed changes to your PR to expedite the publishing process.

Clone the repo to your local machine
# Substitute the url of your fork here:
# git clone https://github.com/zed-industries/extensions
cd extensions
git submodule init
git submodule update
Extension License Requirements
As of October 1st, 2025, extension repositories must include a license. The following licenses are accepted:

Apache 2.0
BSD 2-Clause
BSD 3-Clause
GNU GPLv3
GNU LGPLv3
MIT
zlib
This allows us to distribute the resulting binary produced from your extension code to our users. Without a valid license, the pull request to add or update your extension in the following steps will fail CI.

Your license file should be at the root of your extension repository. Any filename that has LICENCE or LICENSE as a prefix (case insensitive) will be inspected to ensure it matches one of the accepted licenses. See the license validation source code.

This license requirement applies only to your extension code itself (the code that gets compiled into the extension binary). It does not apply to any tools your extension may download or interact with, such as language servers or other external dependencies. If your repository contains both extension code and other projects (like a language server), you are not required to relicense those other projects—only the extension code needs to be one of the aforementioned accepted licenses.

Publishing your extension
To publish an extension, open a PR to the zed-industries/extensions repo.

In your PR, do the following:

Add your extension as a Git submodule within the extensions/ directory
git submodule add https://github.com/your-username/foobar-zed.git extensions/foobar
git add extensions/foobar
All extension submodules must use HTTPS URLs and not SSH URLS (git@github.com).

Add a new entry to the top-level extensions.toml file containing your extension:
[my-extension]
submodule = "extensions/my-extension"
version = "0.0.1"
If your extension is in a subdirectory within the submodule you can use the path field to point to where the extension resides.

Run pnpm sort-extensions to ensure extensions.toml and .gitmodules are sorted
Once your PR is merged, the extension will be packaged and published to the Zed extension registry.

Extension IDs and names should not contain zed or Zed, since they are all Zed extensions.

Updating an extension
To update an extension, open a PR to the zed-industries/extensions repo.

In your PR do the following:

Update the extension's submodule to the commit of the new version. For this, you can run
# From the root of the repository:
git submodule update --remote extensions/your-extension-name
to update your extension to the latest commit available in your remote repository.

Update the version field for the extension in extensions.toml
Make sure the version matches the one set in extension.toml at the particular commit.
If you'd like to automate this process, there is a community GitHub Action you can use.

Note: If your extension repository has a different license, you'll need to update it to be one of the accepted extension licenses before publishing your update.
