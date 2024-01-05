module.exports = {
  packagerConfig: {
    asar: true,
    executableName: 'Gabin',
    icon: './build/resources/icons/app',
    ignore: [
      '^/src($|/)',
      '^/.github($|/)',
      '^/.vscode($|/)',
      '^/forge.config.js$',
      '^/package-lock.json$',
      '^/database.json$',
      '^/.*\.log$',
    ],
    osxSign: {},
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    }
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      executableName: 'Gabin',
      config: {
        options: {
          icon: './build/resources/icons/app.png',
          name: 'Gabin',
          productName: 'Gabin',
        }
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'one-click-studio',
          name: 'gabin'
        },
        prerelease: true,
        force: true
      }
    }
  ]
};
