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
      mainhighlight: '#3265FF',
      mainhover: '#000BD7',
      'negative-hover': '#DA2C13',
      'black-disable': 'rgba(0, 0, 0, 0.25)',
      green: '#27AE60',
    },
    fontSize: {
      xxs: ['0.563rem', { lineHeight: '0.844rem' }],
      xs: ['0.688rem', { lineHeight: '1rem' }],
      sm: ['0.813rem', { lineHeight: '1.219rem' }],
      base: ['1rem', { lineHeight: '1.35rem' }],
      m: ['1.5rem', { lineHeight: '1.5rem' }],
      lg: ['2rem', { lineHeight: '2rem' }],
      xl: ['3rem', { lineHeight: '3.6rem' }],
    }
  },
})
