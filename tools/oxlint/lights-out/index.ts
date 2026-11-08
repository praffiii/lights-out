import { defineRule, eslintCompatPlugin } from '@oxlint/plugins'

const noComments = defineRule({
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow comments: code explains itself through names and types.' },
    messages: {
      comment: 'Remove this comment. Put the reason in a name, a test name, the docs or the commit message.',
    },
  },
  createOnce(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          context.report({ loc: comment.loc, messageId: 'comment' })
        }
      },
    }
  },
})

export default eslintCompatPlugin({
  meta: { name: 'lights-out' },
  rules: { 'no-comments': noComments },
})
