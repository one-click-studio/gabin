{
  description = "Packaging Gabin app in nix.";

  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    {
      overlays.default = final: prev: {
        gabin = prev.pkgs.callPackage ./package.nix {};
      };
    } //
    (flake-utils.lib.eachDefaultSystem
      (system:
        let pkgs = import nixpkgs {
              inherit system;
              overlays = [ self.overlays.default ];
            };
        in
          {
            packages.gabin = pkgs.gabin;
            packages.default = pkgs.gabin;
          }
      ));
}