import ast
import io
import re
import sys
import tokenize
from pathlib import Path

ROOTS = ["src", "blender"]
CSS_STRING = re.compile(r'"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\\n])*\'')
CSS_COMMENT = re.compile(r"/\*.*?\*/", re.S)
DOCUMENTED = (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)


def python_comment_lines(source):
    lines = [t.start[0] for t in tokenize.generate_tokens(io.StringIO(source).readline) if t.type == tokenize.COMMENT]
    for node in ast.walk(ast.parse(source)):
        first = node.body[0] if isinstance(node, DOCUMENTED) and node.body else None
        if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant) and isinstance(first.value.value, str):
            lines.append(first.lineno)
    return sorted(lines)


def css_comment_lines(source):
    blanked = CSS_STRING.sub(lambda m: " " * len(m.group()), source)
    return [source.count("\n", 0, m.start()) + 1 for m in CSS_COMMENT.finditer(blanked)]


def files(args):
    for arg in args or ROOTS:
        path = Path(arg)
        if path.is_file():
            yield path
        elif path.is_dir():
            yield from (p for p in sorted(path.rglob("*")) if p.suffix in (".py", ".css") and "__pycache__" not in p.parts)


def main(args):
    found = 0
    for path in files(args):
        source = path.read_text()
        lines = python_comment_lines(source) if path.suffix == ".py" else css_comment_lines(source)
        for line in lines:
            print(f"{path}:{line} remove this comment")
        found += len(lines)
    return 1 if found else 0


sys.exit(main(sys.argv[1:]))
