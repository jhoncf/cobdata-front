---
inclusion: fileMatch
fileMatchPattern: "**/*.tsx,**/*.jsx"
---

# React Composition Patterns

Composition patterns for building flexible, maintainable React components. Avoid boolean prop proliferation by using compound components, lifting state, and composing internals.

## When to Apply

Reference these guidelines when:
- Refactoring components with many boolean props
- Building reusable component libraries
- Designing flexible component APIs
- Reviewing component architecture
- Working with compound components or context providers

## 1. Component Architecture (HIGH)

- **Avoid boolean props** - Don't add boolean props to customize behavior; use composition instead
- **Compound components** - Structure complex components with shared context

## 2. State Management (MEDIUM)

- **Decouple implementation** - Provider is the only place that knows how state is managed
- **Context interface** - Define generic interface with state, actions, meta for dependency injection
- **Lift state** - Move state into provider components for sibling access

## 3. Implementation Patterns (MEDIUM)

- **Explicit variants** - Create explicit variant components instead of boolean modes
- **Children over render props** - Use children for composition instead of renderX props

## 4. React 19 APIs (MEDIUM)

> React 19+ only. Skip this section if using React 18 or earlier.

- **No forwardRef** - Don't use forwardRef; use use() instead of useContext()
