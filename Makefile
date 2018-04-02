DOCKER ?= docker

container:
	$(DOCKER) build -t carbonql/client-ts .

install:
	$(DOCKER) run -it ${CURDIR}:/src carbonql/client-ts npm install

build: FORCE
	$(DOCKER) run -it -v ${CURDIR}:/src carbonql/client-ts npm run build

FORCE: ;
