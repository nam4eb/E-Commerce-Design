#!/usr/bin/env sh
set -eu

base_url="${BASE_URL:?BASE_URL is required}"
base_url="${base_url%/}"
product_slug="${PRODUCT_SLUG:-daikin-inverter-1-5-hp-atkf35xvmv}"

assert_status() {
  path="$1"
  expected="$2"
  actual="$(curl --silent --show-error --output /tmp/dienmay365-smoke-body --write-out '%{http_code}' "${base_url}${path}")"
  if [ "$actual" != "$expected" ]; then
    echo "${path}: expected ${expected}, got ${actual}" >&2
    exit 1
  fi
}

assert_status /ready 200
assert_status / 200
assert_status /dieu-hoa 200
assert_status "/dieu-hoa/${product_slug}" 200
assert_status /tim-kiem?q=daikin 200
assert_status /gio-hang 200
assert_status /sitemap.xml 200
assert_status /robots.txt 200
assert_status /san-pham-khong-ton-tai 404

curl --silent --show-error "${base_url}/dieu-hoa/${product_slug}" > /tmp/dienmay365-product.html
grep -qi '<title>' /tmp/dienmay365-product.html
grep -qi 'application/ld+json' /tmp/dienmay365-product.html
grep -qi 'canonical' /tmp/dienmay365-product.html
grep -qi '<h1' /tmp/dienmay365-product.html

echo "Production smoke passed for ${base_url}."
