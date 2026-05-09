# Project dependencies (written with the help of AI)

Install hosted packages yourself (`npm install`, `pip install -r requirements.txt`). This repo does not vendor `node_modules` or Python virtualenvs.

---

## Client (`client/`)

Runtime (`dependencies` in [`client/package.json`](client/package.json)):

| Package | Version constraint |
|---------|-------------------|
| firebase | ^11.10.0 |
| react | ^18.3.1 |
| react-dom | ^18.3.1 |
| react-router-dom | ^6.28.0 |

Development (`devDependencies`):

| Package | Version constraint |
|---------|-------------------|
| @types/react | ^18.3.12 |
| @types/react-dom | ^18.3.1 |
| @vitejs/plugin-react | ^4.3.4 |
| vite | ^6.0.0 |

**Commands:** `cd client && npm install`

**Also:** Firebase needs `VITE_*` variables in `client/.env` at dev/build time (do not commit secrets).

---

## Server (`server/`)

Runtime ([`server/package.json`](server/package.json)):

| Package | Version constraint |
|---------|-------------------|
| cors | ^2.8.5 |
| express | ^4.21.0 |
| pg | ^8.13.0 |

**Commands:** `cd server && npm install`

**Runtime:** Node.js LTS recommended (matches Lockfiles generated locally).

---

## Data preprocessing (Python)

For [`preprocessing_and_normalization.py`](preprocessing_and_normalization.py), [`copy_of_9_processing_tutorial.py`](copy_of_9_processing_tutorial.py), and related notebooks:

| Package | Source |
|---------|--------|
| numpy | [`requirements.txt`](requirements.txt) |
| pandas | [`requirements.txt`](requirements.txt) |

Standard library only elsewhere in those scripts: `os`, `re`, `ast`.

**Google Colab-only imports**

These appear in the exported Colab scripts; they are **not** installable via `pip` on a normal machine:

- `google.colab.drive`
- `google.colab.files`

Use Jupyter on Colab for notebook parity, or remove/replace those cells when running locally (adjust CSV paths accordingly).

**Commands:** `pip install -r requirements.txt`

---

## Lockfiles

Exact resolved NPM versions are recorded in:

- [`client/package-lock.json`](client/package-lock.json)
- [`server/package-lock.json`](server/package-lock.json)

Use `npm ci` in CI or reproducible installs from lockfiles.
