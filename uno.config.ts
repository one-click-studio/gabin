// https://github.com/unocss/unocss

import { defineConfig, presetIcons, presetWind } from 'unocss'
import transformerDirective from '@unocss/transformer-directives'

export default defineConfig({
  presets: [presetWind(), presetIcons()],
  transformers: [transformerDirective()],
  theme: {
    colors: {
      bg: {
        1: '#2E3242',
        2: '#252935',
        3: '#131726',
      },
      content: {
          1: '#FFFFFF',
          2: '#A1ADBE',
          3: '#383F50',
          negative: '#E53811',
      },
      main: '#0033FF',
      'main-highlight': '#3265FF',
      'main-hover': '#000BD7',
      'negative-hover': '#DA2C13',
      'black-disable': 'rgba(0, 0, 0, 0.25)',
      green: '#27AE60',
    },
  },
})
