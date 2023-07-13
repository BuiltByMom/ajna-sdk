#!/bin/bash
set -e

# lender deposits into two buckets
./lend.ts add 500 2002.07
./lend.ts add 500 1992.3

# borrower draws debt across both buckets
./borrow.ts draw 750 1.25

# lender withdraws from lower bucket, kicking the loan
./liquidate.ts lenderKick 1992.3
