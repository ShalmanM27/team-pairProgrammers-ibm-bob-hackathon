# Convert every multi-line comment in the codebase to a stack of single-line
# comments. Idempotent: run it twice and nothing changes the second time.
#
# JS / TS / JSX / TSX:
#   /* ... */            ->  // ...
#   Single-line /* x */  ->  // x
#   JSX comments {/* */} are LEFT ALONE - they're the only legal way to write
#   a comment inside JSX markup.
#
# Python:
#   Only """-style triple-quoted blocks that sit in DOCSTRING POSITION
#   (line above is a class/def/if header ending with ':' OR start of file)
#   are converted to # lines. '''-style triples and string literals in
#   expressions are NEVER touched - they're almost always real strings.
#
# Run from repo root:  python3 scripts/convert_comments.py

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

JS_EXTS = {'.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'}
PY_EXTS = {'.py'}
SKIP_DIRS = {'node_modules', '__pycache__', 'dist', 'build',
             '.venv', 'venv', '.git', '.next', '.idea', '.vscode'}


def iter_source_files(root):
    for path in root.rglob('*'):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in JS_EXTS or path.suffix.lower() in PY_EXTS:
            yield path


# ── JS / TS / JSX converter ──────────────────────────────────────────────

def _strip_leading_star(line):
    s = line.lstrip()
    if s.startswith('*'):
        s = s[1:]
        if s.startswith(' '):
            s = s[1:]
    return s


def _is_jsx_block_comment(line, open_idx):
    before = line[:open_idx].rstrip()
    if not before.endswith('{'):
        return False
    close_idx = line.find('*/', open_idx + 2)
    if close_idx == -1:
        return False
    after = line[close_idx + 2:].lstrip()
    return after.startswith('}')


def convert_js(content):
    lines = content.split('\n')
    out = []
    in_block = False
    block_indent = ''

    for raw in lines:
        if not in_block:
            stripped = raw.lstrip()
            indent = raw[:len(raw) - len(stripped)]

            if '/*' not in raw:
                out.append(raw)
                continue

            open_idx = raw.find('/*')
            if _is_jsx_block_comment(raw, open_idx):
                out.append(raw)
                continue

            close_on_same_line = raw.find('*/', open_idx + 2)
            if close_on_same_line != -1:
                before = raw[:open_idx].rstrip()
                inner = raw[open_idx + 2:close_on_same_line].strip()
                if inner.startswith('*'):
                    inner = inner[1:].strip()
                after = raw[close_on_same_line + 2:]
                line_indent = raw[:open_idx]
                if not before and not after.strip():
                    out.append(line_indent + ('// ' + inner if inner else '//'))
                else:
                    code_part = (before + after).rstrip()
                    if code_part:
                        out.append(code_part + ('  // ' + inner if inner else ''))
                    else:
                        out.append(line_indent + ('// ' + inner if inner else '//'))
                continue

            block_indent = indent
            first_after = raw[open_idx + 2:].rstrip()
            cleaned = _strip_leading_star(first_after)
            before = raw[:open_idx].rstrip()
            if before:
                out.append(before)
            out.append(block_indent + ('// ' + cleaned if cleaned else '//'))
            in_block = True

        else:
            if '*/' in raw:
                close_idx = raw.find('*/')
                inner = raw[:close_idx].rstrip()
                cleaned = _strip_leading_star(inner)
                after = raw[close_idx + 2:]
                if cleaned:
                    out.append(block_indent + '// ' + cleaned)
                if after.strip():
                    out.append(after)
                in_block = False
            else:
                cleaned = _strip_leading_star(raw)
                if cleaned.strip():
                    out.append(block_indent + '// ' + cleaned)
                else:
                    out.append(block_indent + '//')

    return '\n'.join(out)


# ── Python converter (conservative) ──────────────────────────────────────

def convert_py(content):
    # Only convert """-blocks that sit in docstring position. Skip ''' blocks
    # entirely. Skip anything where there's code before the triple-quote.
    lines = content.split('\n')
    out = []
    i = 0
    n = len(lines)
    prev_meaningful = None

    while i < n:
        raw = lines[i]
        stripped = raw.lstrip()
        indent = raw[:len(raw) - len(stripped)]

        is_candidate = stripped.startswith('"""')

        if is_candidate:
            in_docstring_position = (
                prev_meaningful is None
                or prev_meaningful.rstrip().endswith(':')
            )
        else:
            in_docstring_position = False

        if is_candidate and in_docstring_position:
            rest = stripped[3:]
            # Single-line: """ ... """
            if '"""' in rest:
                close_idx = rest.index('"""')
                inner = rest[:close_idx].strip()
                trailing = rest[close_idx + 3:]
                if trailing.strip():
                    out.append(raw)
                else:
                    out.append(indent + ('# ' + inner if inner else '#'))
                prev_meaningful = '#'
                i += 1
                continue

            # Multi-line docstring opens here; scan forward for closing """
            doc_indent = indent
            first_inner = rest.rstrip()
            block = []
            if first_inner.strip():
                block.append(doc_indent + '# ' + first_inner.strip())
            j = i + 1
            closed = False
            while j < n:
                body = lines[j]
                if '"""' in body:
                    close_idx = body.index('"""')
                    inner = body[:close_idx].rstrip()
                    if inner.startswith(doc_indent):
                        inner_rel = inner[len(doc_indent):]
                    else:
                        inner_rel = inner.lstrip()
                    if inner_rel.strip():
                        block.append(doc_indent + '# ' + inner_rel)
                    after = body[close_idx + 3:]
                    if after.strip():
                        block.append(after)
                    closed = True
                    j += 1
                    break
                if body.startswith(doc_indent):
                    bdy = body[len(doc_indent):]
                else:
                    bdy = body.lstrip()
                if bdy.strip():
                    block.append(doc_indent + '# ' + bdy)
                else:
                    block.append(doc_indent + '#')
                j += 1

            if closed:
                out.extend(block)
                i = j
                prev_meaningful = '#'
                continue

            out.append(raw)
            i += 1
            continue

        out.append(raw)
        s = stripped.rstrip()
        if s and not s.startswith('#'):
            prev_meaningful = s
        i += 1

    return '\n'.join(out)


def process_file(path):
    try:
        original = path.read_text(encoding='utf-8')
    except (UnicodeDecodeError, OSError):
        return False

    if path.suffix.lower() in PY_EXTS:
        converted = convert_py(original)
    else:
        converted = convert_js(original)

    if converted != original:
        path.write_text(converted, encoding='utf-8')
        return True
    return False


def main():
    total = 0
    changed = 0
    for path in iter_source_files(ROOT):
        total += 1
        if process_file(path):
            changed += 1
            print(f"  rewrote  {path.relative_to(ROOT)}")
    print(f"\nProcessed {total} files, rewrote {changed}.")


if __name__ == '__main__':
    main()
