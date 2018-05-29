BUILDDIR := build
PACKDIR  := ${BUILDDIR}/src

NPM ?= npm

build: FORCE
	$(NPM) install
	$(NPM) run build
	cp -r README.md LICENSE package-lock.json ${PACKDIR}
	cp package-publish.json ${PACKDIR}/package.json
	cd ${PACKDIR} && $(NPM) link

publish: FORCE
	cd ${PACKDIR} && $(NPM) publish --access=public

FORCE: ;
