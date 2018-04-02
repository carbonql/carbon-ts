DOCKER ?= docker

container:
	$(DOCKER) build -t carbonql/client-ts .

install:
	$(DOCKER) run -it carbonql/client-ts npm install

build: FORCE
	$(DOCKER) run -it carbonql/client-ts npm run build

FORCE: ;
