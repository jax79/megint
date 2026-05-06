document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const viewport = document.getElementById('viewport');
    const rectXInput = document.getElementById('rect-x');
    const rectYInput = document.getElementById('rect-y');
    const rectWidthInput = document.getElementById('rect-width');
    const rectHeightInput = document.getElementById('rect-height');
    const addRectBtn = document.getElementById('add-rect-btn');
    const deleteRectBtn = document.getElementById('delete-rect-btn');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const resetBtn = document.getElementById('reset-btn');
    const duplicateRectBtn = document.getElementById('duplicate-rect-btn');
    const rotateCwBtn = document.getElementById('rotate-cw-btn');
    const rotateCcwBtn = document.getElementById('rotate-ccw-btn');
    const resetZoomBtn = document.getElementById('reset-zoom-btn');
    const zoomLevelSelect = document.getElementById('zoom-level-select');
    const zoomInput = document.getElementById('zoom-input');
    const groupBtn = document.getElementById('group-btn');
    const ungroupBtn = document.getElementById('ungroup-btn');
    const exportSvgBtn = document.getElementById('export-svg-btn');
    const anchorViz = document.getElementById('anchor-viz');
    const selectModeBtn = document.getElementById('select-mode-btn');
    const panModeBtn = document.getElementById('pan-mode-btn');
    const fitBtn = document.getElementById('fit-btn');

    let selectedRectsDOM = [];
    let primarySelectedBaseRect = null;
    let rectCounter = 0;
    let groupCounter = 0;

    let isDragging = false;
    let isPanning = false;
    let interactionMode = 'select'; // 'select' or 'pan'

    let dragOffsets_base = [];
    let justDragged = false;
    let currentHighestZIndex = 1;

    let logicalZoom = 1.0;
    let panX = 0;
    let panY = 0;

    const ZOOM_SPEED = 0.05;
    const MIN_ZOOM = 0.05;
    const MAX_ZOOM = 10.0;

    let baseRectangles = [];
    let draggedItems = [];

    let currentAnchorPoint = 'middle-center';

    function updateInputFields(baseRectForInputs) {
        if (baseRectForInputs) {
            const anchorOffset = getAnchorOffsetInBaseCoords(baseRectForInputs, currentAnchorPoint);
            rectXInput.value = (baseRectForInputs.x + anchorOffset.x).toFixed(0);
            rectYInput.value = (baseRectForInputs.y + anchorOffset.y).toFixed(0);
            rectWidthInput.value = baseRectForInputs.w.toFixed(0);
            rectHeightInput.value = baseRectForInputs.h.toFixed(0);
            updateAnchorViz(baseRectForInputs);

            rectXInput.disabled = false;
            rectYInput.disabled = false;
            rectWidthInput.disabled = false;
            rectHeightInput.disabled = false;
            deleteRectBtn.style.display = 'inline-block';
            duplicateRectBtn.style.display = 'inline-block';
            rotateCwBtn.style.display = 'inline-block';
            rotateCcwBtn.style.display = 'inline-block';

            if (selectedRectsDOM.length > 1 ) {
                groupBtn.style.display = 'inline-block';
                groupBtn.disabled = false;
            } else {
                groupBtn.style.display = 'none';
                groupBtn.disabled = true;
            }

            if (baseRectForInputs && baseRectForInputs.type === 'group') {
                ungroupBtn.style.display = 'inline-block';
                ungroupBtn.disabled = false;
            } else {
                ungroupBtn.style.display = 'none';
                ungroupBtn.disabled = true;
            }
        } else {
            rectXInput.value = ''; rectYInput.value = ''; rectWidthInput.value = ''; rectHeightInput.value = '';
            rectXInput.disabled = true; rectYInput.disabled = true; rectWidthInput.disabled = true; rectHeightInput.disabled = true;
            deleteRectBtn.style.display = 'none'; duplicateRectBtn.style.display = 'none';
            rotateCwBtn.style.display = 'none'; rotateCcwBtn.style.display = 'none';
            groupBtn.style.display = 'none'; groupBtn.disabled = true;
            ungroupBtn.style.display = 'none'; ungroupBtn.disabled = true;
            anchorViz.style.display = 'none';
        }
    }

    function updateAnchorViz(item) {
        if (!item) {
            anchorViz.style.display = 'none';
            return;
        }
        const anchorOffset = getAnchorOffsetInBaseCoords(item, currentAnchorPoint);
        anchorViz.style.left = (item.x + anchorOffset.x) + 'px';
        anchorViz.style.top = (item.y + anchorOffset.y) + 'px';
        anchorViz.style.display = 'block';
    }

    function evaluateExpression(str) {
        try {
            if (/[^-+*/().\d\s]/.test(str)) return NaN;
            return new Function(`return (${str})`)();
        } catch (e) {
            return NaN;
        }
    }

    function clearCanvas() {
        baseRectangles.forEach(item => {
            if (item.type === 'group' && item.domElement) item.removeDomElement();
        });
        const allRects = viewport.querySelectorAll('.rectangle');
        allRects.forEach(rect => rect.remove());
        selectedRectsDOM = []; primarySelectedBaseRect = null;
        updateInputFields(null);
        rectCounter = 0; groupCounter = 0; baseRectangles = []; currentHighestZIndex = 1;
        logicalZoom = 1.0; panX = 0; panY = 0;
        updateZoomDisplay(); renderAllRectangles();
    }

    function renderAllRectangles() {
        viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${logicalZoom})`;
        canvas.style.backgroundSize = `${10 * logicalZoom}px ${10 * logicalZoom}px`;
        canvas.style.backgroundPosition = `${panX}px ${panY}px`;

        baseRectangles.forEach(item => {
            if (item.type === 'rectangle') {
                if (item.domElement) {
                    item.domElement.style.left = item.x + 'px';
                    item.domElement.style.top = item.y + 'px';
                    item.domElement.style.width = item.w + 'px';
                    item.domElement.style.height = item.h + 'px';
                    item.domElement.style.zIndex = item.zIndex;
                }
            } else if (item.type === 'group') {
                // Modified createOrUpdateDomElement logic for no-zoom positioning
                if (!item.domElement) {
                    item.domElement = document.createElement('div');
                    item.domElement.id = `group-dom-${item.id}`;
                    item.domElement.classList.add('rectangle');
                    item.domElement.classList.add('group-boundary');
                    viewport.appendChild(item.domElement);
                }
                item.domElement.style.left = item.x + 'px';
                item.domElement.style.top = item.y + 'px';
                item.domElement.style.width = item.w + 'px';
                item.domElement.style.height = item.h + 'px';
                item.domElement.style.zIndex = item.zIndex;
                item.domElement.style.backgroundColor = 'rgba(0,0,0,0)';
                item.domElement.style.border = '1px dashed #888';
            }
        });
        if (primarySelectedBaseRect) updateAnchorViz(primarySelectedBaseRect);
    }

    function updateZoomDisplay() {
        const zoomPercent = Math.round(logicalZoom * 100) + '%';
        zoomInput.value = zoomPercent;
        if (zoomLevelSelect) {
            let foundMatch = false;
            for (let i = 0; i < zoomLevelSelect.options.length; i++) {
                const optionValue = parseFloat(zoomLevelSelect.options[i].value);
                if (Math.abs(optionValue - logicalZoom) < 0.001) {
                    zoomLevelSelect.value = zoomLevelSelect.options[i].value;
                    foundMatch = true; break;
                }
            }
            if (!foundMatch) zoomLevelSelect.value = "";
        }
    }

    function getTopMostParent(item) {
        let current = item;
        while (current.parentId) {
            const parent = baseRectangles.find(br => br.id === current.parentId);
            if (parent) current = parent; else break;
        }
        return current;
    }

    function updateAllBoundingBoxes(item) {
        if (item.type === 'group') {
            item.members.forEach(member => updateAllBoundingBoxes(member));
            item.calculateBoundingBox();
        }
    }

    function getAllLeafMembers(group, leavesArr) {
        group.members.forEach(member => {
            if (member.type === 'rectangle') leavesArr.push(member);
            else if (member.type === 'group') getAllLeafMembers(member, leavesArr);
        });
    }

    function handleItemMouseDown(event) {
        if (interactionMode !== 'select') return;
        event.preventDefault(); event.stopPropagation();
        const clickedDomId = this.id;
        let clickedItemInstance = baseRectangles.find(br => br.id === clickedDomId);
        if (!clickedItemInstance && clickedDomId.startsWith('group-dom-')) {
            const groupId = clickedDomId.replace('group-dom-', '');
            clickedItemInstance = baseRectangles.find(br => br.id === groupId && br.type === 'group');
        }
        if (!clickedItemInstance) return;
        const objectToSelect = getTopMostParent(clickedItemInstance);
        if (event.shiftKey) {
            if (objectToSelect.domElement) {
                const indexInSelection = selectedRectsDOM.indexOf(objectToSelect.domElement);
                if (indexInSelection > -1) {
                    selectedRectsDOM.splice(indexInSelection, 1);
                    objectToSelect.domElement.classList.remove('selected');
                    if (primarySelectedBaseRect && primarySelectedBaseRect.id === objectToSelect.id) {
                        primarySelectedBaseRect = selectedRectsDOM.length > 0 ? baseRectangles.find(br => br.domElement === selectedRectsDOM[selectedRectsDOM.length - 1]) : null;
                    }
                } else {
                    selectedRectsDOM.push(objectToSelect.domElement);
                    objectToSelect.domElement.classList.add('selected');
                    if (!primarySelectedBaseRect || selectedRectsDOM.length === 1) primarySelectedBaseRect = objectToSelect;
                }
            }
        } else {
            if (objectToSelect.domElement) {
                 if (!(selectedRectsDOM.length === 1 && selectedRectsDOM[0] === objectToSelect.domElement)) {
                    clearAndSetPrimarySelection(objectToSelect, objectToSelect.domElement);
                } else {
                    primarySelectedBaseRect = objectToSelect; currentHighestZIndex++; objectToSelect.zIndex = currentHighestZIndex;
                }
            } else if (objectToSelect.type === 'group') {
                deselectAllRectanglesStyling(); selectedRectsDOM = [];
                primarySelectedBaseRect = objectToSelect; currentHighestZIndex++; objectToSelect.zIndex = currentHighestZIndex;
            }
        }
        updateInputFields(primarySelectedBaseRect); renderAllRectangles();
        isDragging = true; draggedItems = []; dragOffsets_base = [];
        const mouseBasePos = getMouseBasePosition(event);

        if (primarySelectedBaseRect && primarySelectedBaseRect.domElement && selectedRectsDOM.includes(primarySelectedBaseRect.domElement)) {
            draggedItems = [primarySelectedBaseRect];
            if (selectedRectsDOM.length > 1) {
                 selectedRectsDOM.forEach(domEl => {
                     const instance = baseRectangles.find(br => br.domElement === domEl);
                     if (instance && !draggedItems.includes(instance)) draggedItems.push(instance);
                 });
            }
        } else if (selectedRectsDOM.length > 0) {
            selectedRectsDOM.forEach(domEl => {
                const instance = baseRectangles.find(br => br.domElement === domEl);
                if (instance) draggedItems.push(instance);
            });
        } else if (primarySelectedBaseRect) {
            draggedItems = [primarySelectedBaseRect];
        }

        if (draggedItems.length > 0) {
            draggedItems.forEach(item => {
                const itemAnchorOffset = (item.type === 'group') ? {x:0,y:0} : getAnchorOffsetInBaseCoords(item, currentAnchorPoint);
                dragOffsets_base.push({ id: item.id, type: item.type, offsetX: mouseBasePos.x - (item.x + itemAnchorOffset.x), offsetY: mouseBasePos.y - (item.y + itemAnchorOffset.y) });
            });
            draggedItems.sort((a, b) => a.zIndex - b.zIndex);
            draggedItems.forEach(item => { currentHighestZIndex++; item.zIndex = currentHighestZIndex; });
            renderAllRectangles();
        }
    }

    function getAnchorOffsetInBaseCoords(baseRect, anchorPoint) {
        let offsetX = 0; offsetY = 0; const w = baseRect.w; const h = baseRect.h;
        switch (anchorPoint) {
            case 'top-left': offsetX=0; offsetY=0; break; case 'top-center': offsetX=w/2; offsetY=0; break;
            case 'top-right': offsetX=w; offsetY=0; break; case 'middle-left': offsetX=0; offsetY=h/2; break;
            case 'middle-center': offsetX=w/2; offsetY=h/2; break; case 'middle-right': offsetX=w; offsetY=h/2; break;
            case 'bottom-left': offsetX=0; offsetY=h; break; case 'bottom-center': offsetX=w/2; offsetY=h; break;
            case 'bottom-right': offsetX=w; offsetY=h; break;
        }
        return { x: offsetX, y: offsetY };
    }

    function getMouseBasePosition(event) {
        const canvasRect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - canvasRect.left - panX) / logicalZoom,
            y: (event.clientY - canvasRect.top - panY) / logicalZoom
        };
    }

    function swapSelectedRectangleDimensions(direction = 'cw') {
        let groupToRotate = null;
        let itemsToProcess = [];

        if (primarySelectedBaseRect &&
            primarySelectedBaseRect.type === 'group' &&
            selectedRectsDOM.length === 1 &&
            selectedRectsDOM[0] === primarySelectedBaseRect.domElement) {
            groupToRotate = primarySelectedBaseRect;
        } else {
            selectedRectsDOM.forEach(domEl => {
                const instance = baseRectangles.find(br => br.domElement === domEl);
                if (instance) itemsToProcess.push(instance);
            });
            if (itemsToProcess.length === 0 && primarySelectedBaseRect) {
                itemsToProcess.push(primarySelectedBaseRect);
            }
        }

        if (groupToRotate || itemsToProcess.length > 0) {
            let anchorGX, anchorGY;
            if (groupToRotate) {
                const groupAnchorOffset = getAnchorOffsetInBaseCoords(groupToRotate, currentAnchorPoint);
                anchorGX = groupToRotate.x + groupAnchorOffset.x;
                anchorGY = groupToRotate.y + groupAnchorOffset.y;
                const leafMembers = [];
                getAllLeafMembers(groupToRotate, leafMembers);
                itemsToProcess = leafMembers;
            } else {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                itemsToProcess.forEach(it => {
                    minX = Math.min(minX, it.x); minY = Math.min(minY, it.y);
                    maxX = Math.max(maxX, it.x + it.w); maxY = Math.max(maxY, it.y + it.h);
                });
                const tempRect = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
                const anchorOffset = getAnchorOffsetInBaseCoords(tempRect, currentAnchorPoint);
                anchorGX = tempRect.x + anchorOffset.x;
                anchorGY = tempRect.y + anchorOffset.y;

                const allLeafs = [];
                itemsToProcess.forEach(it => {
                    if (it.type === 'rectangle') allLeafs.push(it);
                    else if (it.type === 'group') getAllLeafMembers(it, allLeafs);
                });
                itemsToProcess = allLeafs;
            }

            itemsToProcess.forEach(memberRect => {
                const memberCenterX = memberRect.x + memberRect.w / 2;
                const memberCenterY = memberRect.y + memberRect.h / 2;
                const translatedX = memberCenterX - anchorGX;
                const translatedY = memberCenterY - anchorGY;

                let rotatedX, rotatedY;
                if (direction === 'cw') {
                    // Clockwise rotation (90 deg): (x, y) -> (-y, x)
                    rotatedX = -translatedY;
                    rotatedY = translatedX;
                } else { // ccw
                    // Counter-clockwise rotation (90 deg): (x, y) -> (y, -x)
                    rotatedX = translatedY;
                    rotatedY = -translatedX;
                }

                const newGlobalMemberCenterX = anchorGX + rotatedX;
                const newGlobalMemberCenterY = anchorGY + rotatedY;
                const newMemberW = memberRect.h;
                const newMemberH = memberRect.w;

                memberRect.w = newMemberW;
                memberRect.h = newMemberH;
                memberRect.x = newGlobalMemberCenterX - newMemberW / 2;
                memberRect.y = newGlobalMemberCenterY - newMemberH / 2;
            });

            baseRectangles.forEach(br => {
                if (br.type === 'group' && br.parentId === null) updateAllBoundingBoxes(br);
            });
        }

        renderAllRectangles();
        if (primarySelectedBaseRect) updateInputFields(primarySelectedBaseRect);
    }

    function deselectAllRectanglesStyling() { selectedRectsDOM.forEach(domEl => domEl.classList.remove('selected')); }

    function clearAndSetPrimarySelection(baseRectToSelect, domElementToSelect) {
        deselectAllRectanglesStyling(); selectedRectsDOM = [domElementToSelect];
        domElementToSelect.classList.add('selected'); primarySelectedBaseRect = baseRectToSelect;
        currentHighestZIndex++; primarySelectedBaseRect.zIndex = currentHighestZIndex;
    }

    function deselectAllRectangles() {
        deselectAllRectanglesStyling(); selectedRectsDOM = [];
        primarySelectedBaseRect = null; updateInputFields(null);
    }

    function selectItem(item) {
        if (!item) return;
        const topLevelSelectable = getTopMostParent(item);
        if (topLevelSelectable.type === 'rectangle') {
             clearAndSetPrimarySelection(topLevelSelectable, topLevelSelectable.domElement);
        } else if (topLevelSelectable.type === 'group') {
            deselectAllRectanglesStyling(); selectedRectsDOM = [];
            primarySelectedBaseRect = topLevelSelectable; currentHighestZIndex++; topLevelSelectable.zIndex = currentHighestZIndex;
            if (!topLevelSelectable.domElement) {
                topLevelSelectable.domElement = document.createElement('div');
                topLevelSelectable.domElement.id = `group-dom-${topLevelSelectable.id}`;
                topLevelSelectable.domElement.classList.add('rectangle');
                topLevelSelectable.domElement.classList.add('group-boundary');
                viewport.appendChild(topLevelSelectable.domElement);
                topLevelSelectable.domElement.addEventListener('mousedown', handleItemMouseDown);
            }
            selectedRectsDOM.push(topLevelSelectable.domElement);
            topLevelSelectable.domElement.classList.add('selected');
        }
        updateInputFields(primarySelectedBaseRect); renderAllRectangles();
    }

    function createRectangle(baseX, baseY, baseW, baseH) {
        const rectElement = document.createElement('div');
        rectElement.classList.add('rectangle'); const newRectId = `rect-${rectCounter++}`; rectElement.id = newRectId;
        const newRectangleInstance = new CanvasRectangle(newRectId, baseX, baseY, baseW, baseH, 1, rectElement, null);
        baseRectangles.push(newRectangleInstance);
        rectElement.addEventListener('mousedown', handleItemMouseDown);
        viewport.appendChild(rectElement); renderAllRectangles(); selectItem(newRectangleInstance);
    }

    let lastMouseX, lastMouseY;

    canvas.addEventListener('mousedown', (event) => {
        if (interactionMode === 'pan' || event.button === 1) {
            isPanning = true;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            canvas.style.cursor = 'grabbing';
            event.preventDefault();
        }
    });

    document.addEventListener('mousemove', (event) => {
        if (isPanning) {
            const dx = event.clientX - lastMouseX;
            const dy = event.clientY - lastMouseY;
            panX += dx;
            panY += dy;
            lastMouseX = event.clientX;
            lastMouseY = event.clientY;
            renderAllRectangles();
            return;
        }

        if (!isDragging || draggedItems.length === 0) return;
        const mouseBasePos = getMouseBasePosition(event);

        draggedItems.forEach(item => {
            const offsetInfo = dragOffsets_base.find(offset => offset.id === item.id);
            if (offsetInfo) {
                const itemAnchorOffset = (item.type === 'group') ? {x:0,y:0} : getAnchorOffsetInBaseCoords(item, currentAnchorPoint);
                const oldX = item.x;
                const oldY = item.y;
                item.x = mouseBasePos.x - offsetInfo.offsetX - itemAnchorOffset.x;
                item.y = mouseBasePos.y - offsetInfo.offsetY - itemAnchorOffset.y;

                if (item.type === 'group') {
                    const deltaX = item.x - oldX;
                    const deltaY = item.y - oldY;
                    const leafMembers = [];
                    getAllLeafMembers(item, leafMembers);
                    leafMembers.forEach(m => { m.x += deltaX; m.y += deltaY; });
                    updateAllBoundingBoxes(item);
                }
            }
        });

        renderAllRectangles();
        if (primarySelectedBaseRect) updateInputFields(primarySelectedBaseRect);
    });

    document.addEventListener('mouseup', (event) => {
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = interactionMode === 'pan' ? 'grab' : 'default';
        }
        if (isDragging) {
            draggedItems.forEach(item => { if (item.type === 'group') updateAllBoundingBoxes(item); });
            if (primarySelectedBaseRect) updateInputFields(primarySelectedBaseRect);
            isDragging = false; draggedItems = []; dragOffsets_base = []; justDragged = true; renderAllRectangles();
        }
    });

    addRectBtn.addEventListener('click', () => {
        const defaultSizePx = 50; const initialXPx = 10; const initialYPx = 10;
        let newX = initialXPx; let newY = initialYPx;
        if (baseRectangles.length > 0) {
            const lastItem = baseRectangles[baseRectangles.length - 1];
            newX = lastItem.x + 10; newY = lastItem.y + 10;
        }
        createRectangle(newX, newY, defaultSizePx, defaultSizePx);
    });

    canvas.addEventListener('click', (event) => {
        if (justDragged || isPanning) { justDragged = false; return; }
        if (interactionMode !== 'select') return;

        // Find clicked item manually because viewport transformation might confuse simple DOM click
        const mouseBasePos = getMouseBasePosition(event);
        let clickedOnAnyItem = false;
        for (let i = baseRectangles.length - 1; i >= 0; i--) {
            const item = baseRectangles[i];
            if (mouseBasePos.x >= item.x && mouseBasePos.x <= item.x + item.w &&
                mouseBasePos.y >= item.y && mouseBasePos.y <= item.y + item.h) {
                clickedOnAnyItem = true; break;
            }
        }
        if (!clickedOnAnyItem) deselectAllRectangles();
    });

    function handleInputChange(input) {
        if (primarySelectedBaseRect) {
            const itemToUpdate = primarySelectedBaseRect;
            let value = evaluateExpression(input.value);
            if (isNaN(value)) {
                updateInputFields(primarySelectedBaseRect);
                return;
            }
            const oldProps = { x: itemToUpdate.x, y: itemToUpdate.y, w: itemToUpdate.w, h: itemToUpdate.h };
            if (input === rectXInput) {
                const newAnchorX = value; const anchorOffset = getAnchorOffsetInBaseCoords(itemToUpdate, currentAnchorPoint);
                itemToUpdate.x = newAnchorX - anchorOffset.x;
                if (itemToUpdate.type === 'group') {
                    const deltaX = itemToUpdate.x - oldProps.x;
                    const leafMembers = []; getAllLeafMembers(itemToUpdate, leafMembers);
                    leafMembers.forEach(m => m.x += deltaX); updateAllBoundingBoxes(itemToUpdate);
                }
            } else if (input === rectYInput) {
                const newAnchorY = value; const anchorOffset = getAnchorOffsetInBaseCoords(itemToUpdate, currentAnchorPoint);
                itemToUpdate.y = newAnchorY - anchorOffset.y;
                if (itemToUpdate.type === 'group') {
                    const deltaY = itemToUpdate.y - oldProps.y;
                    const leafMembers = []; getAllLeafMembers(itemToUpdate, leafMembers);
                    leafMembers.forEach(m => m.y += deltaY); updateAllBoundingBoxes(itemToUpdate);
                }
            } else if (input === rectWidthInput) {
                value = Math.max(1, value);
                if (itemToUpdate.type === 'rectangle') {
                    const oldW = itemToUpdate.w; itemToUpdate.w = value; const dw = itemToUpdate.w - oldW;
                    const ap = currentAnchorPoint;
                    if (ap.includes('center') && !ap.includes('left') && !ap.includes('right')) itemToUpdate.x -= dw / 2;
                    else if (ap.includes('right')) itemToUpdate.x -= dw;
                } else if (itemToUpdate.type === 'group') {
                    const groupAnchorGlobalX = itemToUpdate.x + getAnchorOffsetInBaseCoords(itemToUpdate, currentAnchorPoint).x;
                    const scaleFactor = value / oldProps.w;
                    if (isFinite(scaleFactor) && scaleFactor > 0) {
                        itemToUpdate.members.forEach(member => {
                            member.x = groupAnchorGlobalX + (member.x - groupAnchorGlobalX) * scaleFactor;
                            member.w *= scaleFactor; if(member.type === 'group') updateAllBoundingBoxes(member);
                        });
                        updateAllBoundingBoxes(itemToUpdate);
                        const newAnchorOffsetX = getAnchorOffsetInBaseCoords(itemToUpdate, currentAnchorPoint).x;
                        itemToUpdate.x = groupAnchorGlobalX - newAnchorOffsetX;
                    }
                }
            } else if (input === rectHeightInput) {
                value = Math.max(1, value);
                if (itemToUpdate.type === 'rectangle') {
                    const oldH = itemToUpdate.h; itemToUpdate.h = value; const dh = itemToUpdate.h - oldH;
                    const ap = currentAnchorPoint;
                    if (ap.includes('middle') && !ap.includes('top') && !ap.includes('bottom')) itemToUpdate.y -= dh / 2;
                    else if (ap.includes('bottom')) itemToUpdate.y -= dh;
                } else if (itemToUpdate.type === 'group') {
                    const groupAnchorGlobalY = itemToUpdate.y + getAnchorOffsetInBaseCoords(itemToUpdate, currentAnchorPoint).y;
                    const scaleFactor = value / oldProps.h;
                    if (isFinite(scaleFactor) && scaleFactor > 0) {
                        itemToUpdate.members.forEach(member => {
                            member.y = groupAnchorGlobalY + (member.y - groupAnchorGlobalY) * scaleFactor;
                            member.h *= scaleFactor; if(member.type === 'group') updateAllBoundingBoxes(member);
                        });
                        updateAllBoundingBoxes(itemToUpdate);
                        const newAnchorOffsetY = getAnchorOffsetInBaseCoords(itemToUpdate, currentAnchorPoint).y;
                        itemToUpdate.y = groupAnchorGlobalY - newAnchorOffsetY;
                    }
                }
            }
            renderAllRectangles(); updateInputFields(primarySelectedBaseRect);
        }
    }

    [rectXInput, rectYInput, rectWidthInput, rectHeightInput].forEach(input => {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') { handleInputChange(input); input.blur(); }
        });
        input.addEventListener('blur', () => { handleInputChange(input); });
        input.addEventListener('keypress', (event) => {
            const charCode = (event.which) ? event.which : event.keyCode;
            const allowedChars = /[0-9+\-*/().\s]/;
            if (charCode > 31 && !allowedChars.test(String.fromCharCode(charCode)) && charCode !== 13) event.preventDefault();
        });
    });

    updateInputFields(null);

    deleteRectBtn.addEventListener('click', () => {
        let itemsToDeleteDirectly = [];
        if (primarySelectedBaseRect && primarySelectedBaseRect.domElement && selectedRectsDOM.includes(primarySelectedBaseRect.domElement)) {
            itemsToDeleteDirectly = [primarySelectedBaseRect];
        } else {
             selectedRectsDOM.forEach(domEl => {
                const instance = baseRectangles.find(br => br.domElement === domEl);
                if (instance) itemsToDeleteDirectly.push(instance);
            });
        }
        if (itemsToDeleteDirectly.length > 0) {
            const allItemInstancesToFullyRemove = new Set();
            function recursivelyCollectMembersForFullDeletion(item) {
                if (allItemInstancesToFullyRemove.has(item)) return;
                allItemInstancesToFullyRemove.add(item);
                if (item.type === 'group') item.members.forEach(member => recursivelyCollectMembersForFullDeletion(member));
            }
            itemsToDeleteDirectly.forEach(item => recursivelyCollectMembersForFullDeletion(item));
            allItemInstancesToFullyRemove.forEach(item => {
                if (item.domElement && item.domElement.parentElement) item.domElement.remove();
                const indexInBase = baseRectangles.indexOf(item);
                if (indexInBase > -1) baseRectangles.splice(indexInBase, 1);
            });
            selectedRectsDOM = []; primarySelectedBaseRect = null; updateInputFields(null);
            renderAllRectangles();
        }
    });

    saveBtn.addEventListener('click', () => {
        const dataToSave = baseRectangles.map(item => {
            const plainItem = { id: item.id, type: item.type, x: item.x, y: item.y, w: item.w, h: item.h, zIndex: item.zIndex, parentId: item.parentId };
            if (item.type === 'group') plainItem.members = item.members.map(member => member.id);
            return plainItem;
        });
        const editorData = { canvasObjects: dataToSave, settings: { rectCounter, groupCounter, currentHighestZIndex, logicalZoom, panX, panY } };
        const blob = new Blob([JSON.stringify(editorData, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = 'canvas_layout.json'; document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    });

    loadBtn.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.accept = '.json,application/json';
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const loadedData = JSON.parse(e.target.result);
                    if (loadedData && loadedData.canvasObjects) {
                        clearCanvas();
                        if(loadedData.settings){
                            rectCounter = loadedData.settings.rectCounter || 0; groupCounter = loadedData.settings.groupCounter || 0;
                            currentHighestZIndex = loadedData.settings.currentHighestZIndex || 1;
                            logicalZoom = loadedData.settings.logicalZoom || 1.0;
                            panX = loadedData.settings.panX || 0; panY = loadedData.settings.panY || 0;
                        }
                        const itemMap = new Map(); baseRectangles = [];
                        loadedData.canvasObjects.forEach(itemData => {
                            let newItem;
                            if (itemData.type === 'rectangle') {
                                const domEl = document.createElement('div'); domEl.id = itemData.id; domEl.classList.add('rectangle'); viewport.appendChild(domEl);
                                newItem = new CanvasRectangle(itemData.id, itemData.x, itemData.y, itemData.w, itemData.h, itemData.zIndex, domEl, itemData.parentId);
                                domEl.addEventListener('mousedown', handleItemMouseDown);
                            } else if (itemData.type === 'group') {
                                newItem = new CanvasGroup(itemData.id, itemData.parentId);
                                newItem.x = itemData.x; newItem.y = itemData.y; newItem.w = itemData.w; newItem.h = itemData.h; newItem.zIndex = itemData.zIndex;
                            }
                            if (newItem) { baseRectangles.push(newItem); itemMap.set(itemData.id, newItem); }
                        });
                        baseRectangles.forEach(item => {
                            const itemData = loadedData.canvasObjects.find(d => d.id === item.id);
                            if (item.type === 'group' && itemData.members) {
                                itemData.members.forEach(memberId => {
                                    const memberInstance = itemMap.get(memberId);
                                    if (memberInstance) item.addMember(memberInstance);
                                });
                            }
                        });
                        renderAllRectangles(); updateZoomDisplay();
                        if (baseRectangles.length > 0) {
                            let topItem = baseRectangles.filter(it => it.parentId === null).sort((a,b) => b.zIndex - a.zIndex)[0];
                            if (topItem) selectItem(topItem);
                        }
                    }
                } catch (error) { console.error(error); }
            };
            reader.readAsText(file);
        });
        fileInput.click();
    });

    resetBtn.addEventListener('click', () => { if (confirm("Biztosan törölni szeretnéd az összes téglalapot és visszaállítani az alapot?")) clearCanvas(); });

    function duplicateItemRecursive(originalItem, newParentIdForMembers, xOffset, yOffset) {
        let newItem;
        const newX = originalItem.x + xOffset;
        const newY = originalItem.y + yOffset;
        currentHighestZIndex++;
        if (originalItem.type === 'rectangle') {
            const newId = `rect-${rectCounter++}`;
            const rectElement = document.createElement('div');
            rectElement.id = newId; rectElement.classList.add('rectangle');
            newItem = new CanvasRectangle(newId, newX, newY, originalItem.w, originalItem.h, currentHighestZIndex, rectElement, newParentIdForMembers);
            baseRectangles.push(newItem); viewport.appendChild(rectElement);
            rectElement.addEventListener('mousedown', handleItemMouseDown);
        } else if (originalItem.type === 'group') {
            const newId = `group-${groupCounter++}`;
            newItem = new CanvasGroup(newId, newParentIdForMembers);
            newItem.zIndex = currentHighestZIndex;
            originalItem.members.forEach(member => {
                const duplicatedMember = duplicateItemRecursive(member, newItem.id, xOffset, yOffset);
                newItem.addMember(duplicatedMember);
            });
            newItem.calculateBoundingBox(); baseRectangles.push(newItem);
        }
        return newItem;
    }

    duplicateRectBtn.addEventListener('click', () => {
        let itemsToDuplicateSource = [];
        if (selectedRectsDOM.length > 0) {
            itemsToDuplicateSource = selectedRectsDOM.map(domEl => baseRectangles.find(br => br.domElement === domEl)).filter(instance => instance);
        } else if (primarySelectedBaseRect) itemsToDuplicateSource = [primarySelectedBaseRect];
        if (itemsToDuplicateSource.length === 0) return;
        deselectAllRectanglesStyling(); selectedRectsDOM = [];
        const newTopLevelItems = [];
        itemsToDuplicateSource.forEach(itemToDuplicate => {
            const newDuplicatedItem = duplicateItemRecursive(itemToDuplicate, null, 10, 10);
            if (newDuplicatedItem) newTopLevelItems.push(newDuplicatedItem);
        });
        if (newTopLevelItems.length > 0) {
            primarySelectedBaseRect = newTopLevelItems[0];
            newTopLevelItems.forEach(item => {
                if (item.domElement) { selectedRectsDOM.push(item.domElement); item.domElement.classList.add('selected'); }
            });
        }
        updateInputFields(primarySelectedBaseRect); renderAllRectangles();
    });

    rotateCwBtn.addEventListener('click', () => swapSelectedRectangleDimensions('cw'));
    rotateCcwBtn.addEventListener('click', () => swapSelectedRectangleDimensions('ccw'));

    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
        let newLogicalZoom = logicalZoom + delta;
        newLogicalZoom = Math.max(MIN_ZOOM, newLogicalZoom); newLogicalZoom = Math.min(MAX_ZOOM, newLogicalZoom);
        if (newLogicalZoom === logicalZoom) return;

        // Zoom relative to mouse position
        const mouseCanvasX = event.clientX - canvas.getBoundingClientRect().left;
        const mouseCanvasY = event.clientY - canvas.getBoundingClientRect().top;
        const mouseBaseX = (mouseCanvasX - panX) / logicalZoom;
        const mouseBaseY = (mouseCanvasY - panY) / logicalZoom;

        logicalZoom = newLogicalZoom;
        panX = mouseCanvasX - mouseBaseX * logicalZoom;
        panY = mouseCanvasY - mouseBaseY * logicalZoom;

        renderAllRectangles(); updateZoomDisplay();
    });

    resetZoomBtn.addEventListener('click', () => {
        logicalZoom = 1.0; panX = 0; panY = 0;
        updateZoomDisplay(); renderAllRectangles();
    });

    const zoomPercentages = [5, 10, 25, 50, 75, 100, 125, 150, 200, 400, 800];
    zoomPercentages.forEach(percentage => {
        const option = document.createElement('option');
        option.value = percentage / 100; option.textContent = `${percentage}%`;
        if (zoomLevelSelect) zoomLevelSelect.appendChild(option);
    });

    zoomLevelSelect.addEventListener('change', (event) => {
        const newLogicalZoom = parseFloat(event.target.value);
        if (!isNaN(newLogicalZoom)) {
            logicalZoom = newLogicalZoom; renderAllRectangles(); updateZoomDisplay();
        }
    });

    zoomInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            let val = parseFloat(zoomInput.value.replace('%', ''));
            if (!isNaN(val)) {
                logicalZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, val / 100));
                renderAllRectangles(); updateZoomDisplay();
            }
            zoomInput.blur();
        }
    });

    const anchorRadioButtons = document.querySelectorAll('input[name="anchor-point"]');
    anchorRadioButtons.forEach(radio => {
        radio.addEventListener('change', (event) => {
            currentAnchorPoint = event.target.value;
            if (primarySelectedBaseRect) updateInputFields(primarySelectedBaseRect);
        });
    });

    selectModeBtn.addEventListener('click', () => {
        interactionMode = 'select';
        selectModeBtn.classList.add('mode-active');
        panModeBtn.classList.remove('mode-active');
        canvas.style.cursor = 'default';
    });

    panModeBtn.addEventListener('click', () => {
        interactionMode = 'pan';
        panModeBtn.classList.add('mode-active');
        selectModeBtn.classList.remove('mode-active');
        canvas.style.cursor = 'grab';
    });

    fitBtn.addEventListener('click', () => {
        if (baseRectangles.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        baseRectangles.forEach(item => {
            minX = Math.min(minX, item.x); minY = Math.min(minY, item.y);
            maxX = Math.max(maxX, item.x + item.w); maxY = Math.max(maxY, item.y + item.h);
        });
        const contentW = maxX - minX; const contentH = maxY - minY;
        const canvasW = canvas.clientWidth - 40; const canvasH = canvas.clientHeight - 40;
        logicalZoom = Math.min(canvasW / contentW, canvasH / contentH, 1.0);
        panX = (canvas.clientWidth - contentW * logicalZoom) / 2 - minX * logicalZoom;
        panY = (canvas.clientHeight - contentH * logicalZoom) / 2 - minY * logicalZoom;
        renderAllRectangles(); updateZoomDisplay();
    });

    groupBtn.addEventListener('click', () => {
        if (selectedRectsDOM.length > 1) {
            const selectedInstances = [];
            selectedRectsDOM.forEach(domEl => {
                const instance = baseRectangles.find(br => br.domElement === domEl);
                if (instance) selectedInstances.push(instance);
            });
            if (selectedInstances.length <= 1) return;
            const newGroupId = `group-${groupCounter++}`;
            const newGroup = new CanvasGroup(newGroupId);
            currentHighestZIndex++; newGroup.zIndex = currentHighestZIndex;
            selectedInstances.forEach(instance => newGroup.addMember(instance));
            newGroup.calculateBoundingBox(); baseRectangles.push(newGroup);
            deselectAllRectanglesStyling(); selectedRectsDOM = [];
            selectItem(newGroup);
        }
    });

    ungroupBtn.addEventListener('click', () => {
        if (primarySelectedBaseRect && primarySelectedBaseRect.type === 'group') {
            const groupToUngroup = primarySelectedBaseRect;
            groupToUngroup.removeDomElement();
            const membersToRelease = [...groupToUngroup.members];
            if (membersToRelease.length === 0) {
                const groupIndex = baseRectangles.indexOf(groupToUngroup);
                if (groupIndex > -1) baseRectangles.splice(groupIndex, 1);
                primarySelectedBaseRect = null; updateInputFields(null); renderAllRectangles(); return;
            }
            membersToRelease.forEach(member => groupToUngroup.removeMember(member));
            const groupIndex = baseRectangles.indexOf(groupToUngroup);
            if (groupIndex > -1) baseRectangles.splice(groupIndex, 1);
            deselectAllRectanglesStyling(); selectedRectsDOM = [];
            membersToRelease.forEach(member => {
                if (member.domElement) { selectedRectsDOM.push(member.domElement); member.domElement.classList.add('selected'); }
            });
            primarySelectedBaseRect = membersToRelease.length > 0 ? membersToRelease[0] : null;
            updateInputFields(primarySelectedBaseRect); renderAllRectangles();
        }
    });

    function exportToSVG() {
        if (baseRectangles.length === 0) { alert("Nincs mit exportálni!"); return; }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        baseRectangles.forEach(item => {
            if (item.type === 'rectangle') {
                minX = Math.min(minX, item.x); minY = Math.min(minY, item.y);
                maxX = Math.max(maxX, item.x + item.w); maxY = Math.max(maxY, item.y + item.h);
            }
        });
        const padding = 20;
        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;
        const offsetX = -minX + padding;
        const offsetY = -minY + padding;

        let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
        baseRectangles.filter(item => item.type === 'rectangle').sort((a,b) => a.zIndex - b.zIndex).forEach(rect => {
            svgContent += `  <rect x="${rect.x + offsetX}" y="${rect.y + offsetY}" width="${rect.w}" height="${rect.h}" fill="rgba(200, 200, 200, 0.6)" stroke="black" stroke-width="1" />\n`;
        });
        svgContent += '</svg>';
        const blob = new Blob([svgContent], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = 'export.svg'; document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }
    exportSvgBtn.addEventListener('click', exportToSVG);
});
