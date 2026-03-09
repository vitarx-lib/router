import { parse } from '@babel/parser'
import { babelGenerate, babelTraverse } from './babelUtils.js'

/**
 * 移除 definePage 宏调用（仅在构建模式下）
 */
export function removeDefinePage(
  code: string,
  id: string,
  DEFINE_PAGE_SOURCES: string[]
): { code: string; map: null } | null {
  const hasDefinePageContent =
    code.includes('definePage') || DEFINE_PAGE_SOURCES.some(src => code.includes(src))

  if (!hasDefinePageContent) {
    return null
  }

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'topLevelAwait',
        'classProperties',
        'objectRestSpread',
        'dynamicImport'
      ]
    })

    let hasDefinePage = false
    let definePageLocalName: string | null = null

    babelTraverse(ast, {
      ImportDeclaration(nodePath) {
        const { node } = nodePath

        if (!DEFINE_PAGE_SOURCES.includes(node.source.value)) {
          return
        }

        const specifiers = node.specifiers.filter(spec => {
          if (spec.type === 'ImportSpecifier') {
            const importedName =
              spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value

            if (importedName === 'definePage') {
              definePageLocalName = spec.local.name
              hasDefinePage = true
              return false
            }
          }
          return true
        })

        if (specifiers.length > 0) {
          node.specifiers = specifiers
        } else {
          nodePath.remove()
        }
      },

      CallExpression(nodePath) {
        const { node } = nodePath

        if (node.callee.type === 'Identifier' && node.callee.name === 'definePage') {
          hasDefinePage = true
          nodePath.remove()
        }

        if (
          definePageLocalName &&
          definePageLocalName !== 'definePage' &&
          node.callee.type === 'Identifier' &&
          node.callee.name === definePageLocalName
        ) {
          hasDefinePage = true
          nodePath.remove()
        }
      }
    })

    if (!hasDefinePage) {
      return null
    }

    const output = babelGenerate(ast, {
      retainLines: false,
      compact: false
    })

    return {
      code: output.code,
      map: null
    }
  } catch (error) {
    console.warn(`[vitarx-router] 转换代码失败: ${id}`, error)
    return null
  }
}
