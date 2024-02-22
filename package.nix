# Inspired by pkgs/applications/editors/uivonim/default.nix 
{ lib, buildNpmPackage, fetchFromGitHub, electron }:

buildNpmPackage rec {
  pname = "gabin";
  version = "0.1";

  src = ./.;

  npmDepsHash = lib.fakeHash;

  makeCacheWritable = true;

  # Useful for debugging, just run "electron ."
  nativeBuildInputs = [
    electron
  ];

  # Otherwise it will try to run a build phase (via npm build) that we don't have or need, with an error:
  # Missing script: "build"
  # This method is used in pkgs/by-name/in/indiepass-desktop/package.nix
  dontNpmBuild = true;

  # Needed, otherwise you will get an error:
  # RequestError: getaddrinfo EAI_AGAIN github.com
  env = {
    ELECTRON_SKIP_BINARY_DOWNLOAD = 1;
  };
  
  # The node_modules/XXX is such that XXX is the "name" in package.json
  # The path might differ, for instance in electron-forge you need build/main/main.js
  postInstall = ''
    makeWrapper ${electron}/bin/electron $out/bin/${pname} \
      --add-flags $out/lib/node_modules/${pname}/build/main/index.js
  '';

}