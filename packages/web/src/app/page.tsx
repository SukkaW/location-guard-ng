// @ts-expect-error -- intentional usage for React Fast Refresh support

// eslint-disable-next-line import-x/no-relative-packages -- doesn't work
import CONTENT from '../../../../README.md' with { turbopackLoader: 'raw-loader', turbopackAs: '*.js' };

import { cache } from 'react';
import { foxmd } from 'foxmd';
import type { FoxmdRendererOptions } from 'foxmd';
import NextLink from 'next/link';
import { Blockquote, Code, Em, Heading, Link, Separator, Strong, Table, Text } from '@radix-ui/themes';

import styles from './page.module.css';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

// Radix's Heading defaults to size "6" regardless of level — scale it down as headings get
// deeper so the README keeps a visible hierarchy instead of every level looking the same.
const HEADING_SIZE: Record<HeadingLevel, '3' | '4' | '5' | '6' | '7' | '8'> = {
  1: '8',
  2: '7',
  3: '6',
  4: '5',
  5: '4',
  6: '3'
};

const docsMarkdownRendererOptions: FoxmdRendererOptions = {
  suppressHydrationWarning: false,
  customRenderMethods: {
    heading(reactKey, children, level, id) {
      return (
        <Heading
          key={reactKey}
          id={id}
          as={`h${level}`}
          size={HEADING_SIZE[level]}
          mt="6"
          mb="3"
          className={level === 1 ? styles.h1 : undefined}
        >
          {children}
        </Heading>
      );
    },
    paragraph(reactKey, children) {
      return (
        <Text key={reactKey} as="p" size="3" mb="4" style={{ lineHeight: 1.6 }}>
          {children}
        </Text>
      );
    },
    link(reactKey, href, text, title) {
      // Radix's Link only carries the visual styling (color, underline behavior) — asChild
      // hands actual rendering to next/link's Slot so client-side routing/prefetching still work.
      return (
        <Link asChild key={reactKey}>
          <NextLink href={filterLinkHref(href)} title={title}>{text}</NextLink>
        </Link>
      );
    },
    strong(reactKey, children) {
      return <Strong key={reactKey}>{children}</Strong>;
    },
    em(reactKey, children) {
      return <Em key={reactKey}>{children}</Em>;
    },
    blockquote(reactKey, children) {
      return <Blockquote key={reactKey} color="gray" my="4">{children}</Blockquote>;
    },
    codespan(reactKey, code) {
      return <Code key={reactKey}>{code}</Code>;
    },
    code(reactKey, code, lang) {
      return (
        <pre
          key={reactKey}
          data-language={lang}
          style={{
            overflowX: 'auto',
            padding: 'var(--space-3)',
            margin: '0 0 var(--space-4)',
            borderRadius: 'var(--radius-3)',
            border: '1px solid var(--gray-a5)',
            backgroundColor: 'var(--gray-a2)'
          }}
        >
          <Code variant="ghost" size="2" style={{ whiteSpace: 'pre' }}>{code}</Code>
        </pre>
      );
    },
    hr(reactKey) {
      return <Separator key={reactKey} size="4" my="5" />;
    },
    image(reactKey, src, alt, title) {
      // README badges/screenshots are arbitrary remote URLs, not build-time-known assets —
      // next/image can't optimize those, so a plain (but responsive) <img> is the right tool.
      return <img key={reactKey} src={src} alt={alt} title={title ?? undefined} style={{ maxWidth: '100%', height: 'auto' }} />;
    },
    table(reactKey, children) {
      return <Table.Root key={reactKey} variant="surface" my="4">{children}</Table.Root>;
    },
    tableHeader(reactKey, children) {
      return <Table.Header key={reactKey}>{children}</Table.Header>;
    },
    tableBody(reactKey, children) {
      return <Table.Body key={reactKey}>{children}</Table.Body>;
    },
    tableRow(reactKey, children) {
      return <Table.Row key={reactKey}>{children}</Table.Row>;
    },
    tableCell(reactKey, children, flags) {
      const style = flags.align ? { textAlign: flags.align } : undefined;
      return flags.header
        ? <Table.ColumnHeaderCell key={reactKey} style={style}>{children}</Table.ColumnHeaderCell>
        : <Table.Cell key={reactKey} style={style}>{children}</Table.Cell>;
    }
  },
  UNSAFE_allowHtml: true
};

const getContent = cache(function getContent() {
  const { jsx } = foxmd(CONTENT, {
    foxmdRendererOptions: {
      ...docsMarkdownRendererOptions
    },
    foxmdParserOptions: {
      UNSAFE_pickSingleImageChildOutOfParentParagraph: true
    }
  });

  return jsx;
});

export default function Homepage() {
  return getContent();
}

function filterLinkHref(href: string) {
  if (href.startsWith('javascript:')) {
    return '#';
  }

  if (href.startsWith('https://location-guard-ng.skk.moe/')) {
    return `/${href.slice('https://location-guard-ng.skk.moe/'.length)}`;
  }

  return href;
}
