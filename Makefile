# ==============================================================================
# Project Setup — Downloads remote skills that cannot be committed to this repo.
# Works on macOS and Windows (Git Bash / MSYS2 / make for Windows).
# Prerequisites: git, curl
# ==============================================================================

# Remote skill sources (sparse-checkout from a single repo)
# Format: sparse_path|local_dest

SKILLS_REPO := https://github.com/anthropics/skills.git
SKILLS_BRANCH := main

# Mapping: <sparse-checkout path> -> <local destination directory>
REMOTE_SKILLS := \
	skills/pptx|exercise-003-skill-solution/.kiro/skills/pptx-skill

# Full-repo skill clones (entire repo -> local destination)
# Format: repo_url|local_dest
FULL_REPO_SKILLS := \
	https://github.com/SpillwaveSolutions/plantuml.git|exercise-003-skill-solution/.kiro/skills/plantuml-skill

# Temporary clone directory
TEMP_DIR := .tmp-skills-clone

# ==============================================================================
# Targets
# ==============================================================================

.PHONY: setup clean-skills help

## setup: Download all remote skills into their project directories
setup:
	@echo "==> Downloading remote skills (sparse-checkout)..."
	@if [ -d "$(TEMP_DIR)" ]; then rm -rf "$(TEMP_DIR)"; fi
	@git clone --depth 1 --filter=blob:none --sparse --branch $(SKILLS_BRANCH) \
		$(SKILLS_REPO) $(TEMP_DIR)
	@cd $(TEMP_DIR) && git sparse-checkout set $(foreach s,$(REMOTE_SKILLS),$(firstword $(subst |, ,$(s))))
	@$(foreach s,$(REMOTE_SKILLS), \
		$(eval SPARSE_PATH := $(firstword $(subst |, ,$(s)))) \
		$(eval LOCAL_DEST := $(lastword $(subst |, ,$(s)))) \
		echo "    Copying $(SPARSE_PATH) -> $(LOCAL_DEST)" && \
		mkdir -p "$(LOCAL_DEST)" && \
		cp -r $(TEMP_DIR)/$(SPARSE_PATH)/* "$(LOCAL_DEST)/" && \
	) true
	@rm -rf "$(TEMP_DIR)"
	@echo "==> Downloading remote skills (full-repo clones)..."
	@$(foreach s,$(FULL_REPO_SKILLS), \
		$(eval REPO_URL := $(firstword $(subst |, ,$(s)))) \
		$(eval LOCAL_DEST := $(lastword $(subst |, ,$(s)))) \
		echo "    Cloning $(REPO_URL) -> $(LOCAL_DEST)" && \
		rm -rf "$(LOCAL_DEST)" && \
		git clone --depth 1 $(REPO_URL) "$(LOCAL_DEST)" && \
		rm -rf "$(LOCAL_DEST)/.git" && \
	) true
	@echo "==> Done. Remote skills installed."

## clean-skills: Remove all downloaded remote skills
clean-skills:
	@echo "==> Removing downloaded remote skills..."
	@$(foreach s,$(REMOTE_SKILLS), \
		$(eval LOCAL_DEST := $(lastword $(subst |, ,$(s)))) \
		echo "    Removing $(LOCAL_DEST)" && \
		rm -rf "$(LOCAL_DEST)" && \
	) true
	@$(foreach s,$(FULL_REPO_SKILLS), \
		$(eval LOCAL_DEST := $(lastword $(subst |, ,$(s)))) \
		echo "    Removing $(LOCAL_DEST)" && \
		rm -rf "$(LOCAL_DEST)" && \
	) true
	@rm -rf "$(TEMP_DIR)"
	@echo "==> Done."

## help: Show available targets
help:
	@echo "Available targets:"
	@echo "  make setup         - Download remote skills into project directories"
	@echo "  make clean-skills  - Remove downloaded remote skills"
	@echo "  make help          - Show this help"
	@echo ""
	@echo "Prerequisites: git"
