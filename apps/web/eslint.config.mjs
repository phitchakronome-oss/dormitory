// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/singleline-html-element-content-newline': 'off',
    'vue/multiline-html-element-content-newline': 'off',
    'vue/max-attributes-per-line': 'off',
    'vue/html-self-closing': 'off',
    'vue/attributes-order': 'off',
    'vue/html-indent': 'off',
    'vue/first-attribute-linebreak': 'off',
    'vue/html-closing-bracket-newline': 'off',
    '@stylistic/semi': 'off',
    '@stylistic/quotes': 'off',
    '@stylistic/comma-dangle': 'off',
    '@stylistic/indent': 'off',
    '@stylistic/arrow-parens': 'off',
    '@stylistic/member-delimiter-style': 'off',
    '@typescript-eslint/no-explicit-any': 'off'
  }
})
