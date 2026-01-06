#!/bin/bash

echo "Checking for files that do not end in a newline..."

exitcode=0
while IFS= read -r file; do
    if ! file "$file" | grep -q "text"; then
        continue
    fi

    first_line=$(head -n 1 "$file")
    if [ -z "${first_line//[[:space:]]/}" ]; then
        echo "::error file=$file::File starts with a blank line."
        exitcode=1
    fi

    last_char=$(tail -c 1 "$file")
    if [ "$last_char" != "" ] && [ "$last_char" != $'\n' ]; then
        echo "::error file=$file::File does not end with a newline character."
        exitcode=1
    fi
done < <(git ls-files --cached --others --exclude-standard)

echo "Finished: exitcode=${exitcode}"

exit $exitcode
