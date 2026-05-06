// Full planb.js from current state,
// with ONLY rotateCwBtn and rotateCcwBtn listeners modified.

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    // ... (all other variable declarations and functions as they are in the current state of planb.js) ...
    // ... (this includes the fully implemented swapSelectedRectangleDimensions) ...

    // MODIFIED Button Listeners:
    rotateCwBtn.addEventListener('click', () => swapSelectedRectangleDimensions('cw')); 
    rotateCcwBtn.addEventListener('click', () => swapSelectedRectangleDimensions('ccw')); 

    // ... (Rest of the planb.js file as it was) ...
}); // End of DOMContentLoaded


// --- PASTE THE FULL CONTENT of planb.js (user base + duplicateItemRecursive + updated duplicateBtn listener + full swapSelectedRectangleDimensions) here, ---
// --- replacing ONLY the rotateCwBtn and rotateCcwBtn listeners with the ones above. ---
// --- For brevity, I'm not pasting the entire 1000+ lines again. ---
// --- The following is the exact content from the previous `overwrite_file_with_block` ---
// --- (which was user's "good" version + duplicate functions + group button visibility fix + full swapSelectedRectangleDimensions for group rotation) ---
// --- with just its rotate button listeners modified. ---
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
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
    const rotateCwBtn = document.getElementById('rotate-cw-btn'); // Ref kept
    const rotateCcwBtn = document.getElementById('rotate-ccw-btn'); // Ref kept
    const resetZoomBtn = document.getElementById('reset-zoom-btn');
    const zoomLevelSelect = document.getElementById('zoom-level-select');
    const groupBtn = document.getElementById('group-btn');
    const ungroupBtn = document.getElementById('ungroup-btn');

    let selectedRectsDOM = []; 
    let primarySelectedBaseRect = null; 
    let rectCounter = 0; 
    let groupCounter = 0; 

    let isDragging = false;
    let dragOffsets_base = []; 
    let justDragged = false;
    let currentHighestZIndex = 1;

    let logicalZoom = 1.0;
    const ZOOM_SPEED = 0.05;
    const MIN_ZOOM = 0.2;
    const MAX_ZOOM = 3.0;

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
        }
    }

    function clearCanvas() {
        baseRectangles.forEach(item => {
            if (item.type === 'group' && item.domElement) item.removeDomElement(); 
        });
        const allRects = canvas.querySelectorAll('.rectangle'); 
        allRects.forEach(rect => rect.remove());
        selectedRectsDOM = []; primarySelectedBaseRect = null;
        updateInputFields(null); 
        rectCounter = 0; groupCounter = 0; baseRectangles = []; currentHighestZIndex = 1; 
        logicalZoom = 1.0; canvas.style.backgroundSize = `${10 * logicalZoom}px ${10 * logicalZoom}px`;
        updateZoomDisplay(); renderAllRectangles(); 
    }

    function renderAllRectangles() {
        baseRectangles.forEach(item => {
            if (item.type === 'rectangle') {
                if (item.domElement) { 
                    item.domElement.style.left = (item.x * logicalZoom) + 'px';
                    item.domElement.style.top = (item.y * logicalZoom) + 'px';
                    item.domElement.style.width = (item.w * logicalZoom) + 'px';
                    item.domElement.style.height = (item.h * logicalZoom) + 'px';
                    item.domElement.style.zIndex = item.zIndex;
                }
            } else if (item.type === 'group') {
                item.createOrUpdateDomElement(canvas, logicalZoom); 
            }
        });
    }

    function updateZoomDisplay() {
        if (zoomLevelSelect) {
            let foundMatch = false;
            for (let i = 0; i < zoomLevelSelect.options.length; i++) {
                const optionValue = parseFloat(zoomLevelSelect.options[i].value);
                if (Math.abs(optionValue - logicalZoom) < 0.001) {
                    zoomLevelSelect.value = zoomLevelSelect.options[i].value;
                    foundMatch = true; break;
                }
            }
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
        const mousePosOnCanvas = getMousePositionOnCanvas(event);
        const mouseBasePos = { x: mousePosOnCanvas.x / logicalZoom, y: mousePosOnCanvas.y / logicalZoom };
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
            if (draggedItems.length === 1 && draggedItems[0].type === 'group') {
                const group = draggedItems[0];
                dragOffsets_base.push({ id: group.id, type: 'group', offsetX: mouseBasePos.x - group.x, offsetY: mouseBasePos.y - group.y });
                currentHighestZIndex++; group.zIndex = currentHighestZIndex;
            } else {
                draggedItems.forEach(item => {
                    const itemAnchorOffset = (item.type === 'group') ? {x:0,y:0} : getAnchorOffsetInBaseCoords(item, currentAnchorPoint);
                    dragOffsets_base.push({ id: item.id, type: item.type, offsetX: mouseBasePos.x - (item.x + itemAnchorOffset.x), offsetY: mouseBasePos.y - (item.y + itemAnchorOffset.y) });
                });
                if (draggedItems.length > 0) {
                    draggedItems.sort((a, b) => a.zIndex - b.zIndex);
                    draggedItems.forEach(item => { currentHighestZIndex++; item.zIndex = currentHighestZIndex; });
                }
            }
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

    function getMousePositionOnCanvas(event) {
        const canvasRect = canvas.getBoundingClientRect();
        return { x: event.clientX - canvasRect.left, y: event.clientY - canvasRect.top };
    }

    function swapSelectedRectangleDimensions(direction = 'cw') { 
        let isSingleGroupRotation = false;
        let groupToRotate = null;
        let dimensionsChangedForPrimaryOrGroup = false;

        if (primarySelectedBaseRect && 
            primarySelectedBaseRect.type === 'group' &&
            selectedRectsDOM.length === 1 && 
            selectedRectsDOM[0] === primarySelectedBaseRect.domElement) {
            isSingleGroupRotation = true;
            groupToRotate = primarySelectedBaseRect;
        }

        if (isSingleGroupRotation && groupToRotate) {
            const groupAnchorOffset = getAnchorOffsetInBaseCoords(groupToRotate, currentAnchorPoint);
            const anchorGX = groupToRotate.x + groupAnchorOffset.x;
            const anchorGY = groupToRotate.y + groupAnchorOffset.y;

            const leafMembers = [];
            getAllLeafMembers(groupToRotate, leafMembers); 
            
            if (leafMembers.length > 0) {
                leafMembers.forEach(memberRect => {
                    if (memberRect.type === 'rectangle') { 
                        const memberCenterX = memberRect.x + memberRect.w / 2;
                        const memberCenterY = memberRect.y + memberRect.h / 2;

                        const translatedX = memberCenterX - anchorGX;
                        const translatedY = memberCenterY - anchorGY;

                        let rotatedX, rotatedY;
                        if (direction === 'cw') {
                            rotatedX = translatedY;
                            rotatedY = -translatedX;
                        } else { // ccw
                            rotatedX = -translatedY;
                            rotatedY = translatedX;
                        }

                        const newGlobalMemberCenterX = anchorGX + rotatedX;
                        const newGlobalMemberCenterY = anchorGY + rotatedY;

                        const newMemberW = memberRect.h; 
                        const newMemberH = memberRect.w;

                        memberRect.w = newMemberW;
                        memberRect.h = newMemberH;
                        memberRect.x = newGlobalMemberCenterX - newMemberW / 2;
                        memberRect.y = newGlobalMemberCenterY - newMemberH / 2;
                    }
                });
                updateAllBoundingBoxes(groupToRotate); 
                dimensionsChangedForPrimaryOrGroup = true;
            }
        } else { 
            let itemsToProcessIndividually = [];
            selectedRectsDOM.forEach(domEl => {
                const instance = baseRectangles.find(br => br.domElement === domEl && br.type === 'rectangle');
                if (instance) itemsToProcessIndividually.push(instance);
            });
            
            if (itemsToProcessIndividually.length === 0 && 
                primarySelectedBaseRect && primarySelectedBaseRect.type === 'rectangle' && 
                selectedRectsDOM.length === 1 && selectedRectsDOM[0] === primarySelectedBaseRect.domElement){
                 itemsToProcessIndividually.push(primarySelectedBaseRect);
            }

            itemsToProcessIndividually.forEach(baseRectToSwap => {
                const oldW = baseRectToSwap.w; const oldH = baseRectToSwap.h;
                baseRectToSwap.w = oldH; baseRectToSwap.h = oldW;
                const dw = baseRectToSwap.w - oldW; const dh = baseRectToSwap.h - oldH; 
                const ap = currentAnchorPoint; 
                if (ap.includes('center') && !ap.includes('left') && !ap.includes('right')) baseRectToSwap.x -= dw / 2;
                else if (ap.includes('right')) baseRectToSwap.x -= dw;
                if (ap.includes('middle') && !ap.includes('top') && !ap.includes('bottom')) baseRectToSwap.y -= dh / 2;
                else if (ap.includes('bottom')) baseRectToSwap.y -= dh;
                if (primarySelectedBaseRect && primarySelectedBaseRect.id === baseRectToSwap.id) {
                    dimensionsChangedForPrimaryOrGroup = true; 
                }
            });
        }

        renderAllRectangles();
        if (dimensionsChangedForPrimaryOrGroup && primarySelectedBaseRect) { 
            updateInputFields(primarySelectedBaseRect); 
        } else if (primarySelectedBaseRect) { 
             updateInputFields(primarySelectedBaseRect);
        } else { 
             updateInputFields(null);
        }
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

    function selectRectangle(domElementToSelect) {
        const baseRectToSelect = baseRectangles.find(br => br.domElement === domElementToSelect);
        if (!baseRectToSelect) { console.warn("selectRectangle: baseRect not found for domEl", domElementToSelect); return; }
        const topLevelSelectable = getTopMostParent(baseRectToSelect);
        if (topLevelSelectable.domElement) {
             clearAndSetPrimarySelection(topLevelSelectable, topLevelSelectable.domElement);
        } else if (topLevelSelectable.type === 'group') {
            deselectAllRectanglesStyling(); selectedRectsDOM = [];
            primarySelectedBaseRect = topLevelSelectable; currentHighestZIndex++; topLevelSelectable.zIndex = currentHighestZIndex;
            if (!topLevelSelectable.domElement) topLevelSelectable.createOrUpdateDomElement(canvas, logicalZoom);
            if (topLevelSelectable.domElement) {
                 selectedRectsDOM.push(topLevelSelectable.domElement);
                 topLevelSelectable.domElement.classList.add('selected');
            }
        }
        updateInputFields(primarySelectedBaseRect); renderAllRectangles();
    }

    function createRectangle(baseX, baseY, baseW, baseH) {
        const rectElement = document.createElement('div');
        rectElement.classList.add('rectangle'); const newRectId = `rect-${rectCounter++}`; rectElement.id = newRectId;
        const newRectangleInstance = new CanvasRectangle(newRectId, baseX, baseY, baseW, baseH, 1, rectElement, null);
        baseRectangles.push(newRectangleInstance);
        rectElement.addEventListener('mousedown', handleItemMouseDown);
        canvas.appendChild(rectElement); renderAllRectangles(); selectRectangle(rectElement);
    }

    document.addEventListener('mousemove', (event) => {
        if (!isDragging || draggedItems.length === 0) return; 
        const mousePosOnCanvas = getMousePositionOnCanvas(event);
        const mouseBasePos = { x: mousePosOnCanvas.x / logicalZoom, y: mousePosOnCanvas.y / logicalZoom };
        const singleDraggedItem = (draggedItems.length === 1) ? draggedItems[0] : null;
        const groupOffsetInfo = (singleDraggedItem && singleDraggedItem.type === 'group') ? dragOffsets_base.find(offset => offset.id === singleDraggedItem.id && offset.type === 'group') : null;
        if (groupOffsetInfo && singleDraggedItem) {
            const draggedGroup = singleDraggedItem;
            const newGroupX = mouseBasePos.x - groupOffsetInfo.offsetX;
            const newGroupY = mouseBasePos.y - groupOffsetInfo.offsetY;
            const deltaX = newGroupX - draggedGroup.x;
            const deltaY = newGroupY - draggedGroup.y;
            const leafMembers = []; getAllLeafMembers(draggedGroup, leafMembers);
            leafMembers.forEach(member => { member.x += deltaX; member.y += deltaY; });
            updateAllBoundingBoxes(draggedGroup);
        } else {
            draggedItems.forEach(item => {
                const offsetInfo = dragOffsets_base.find(offset => offset.id === item.id);
                if (offsetInfo) {
                    const itemAnchorOffset = (item.type === 'group' || offsetInfo.type === 'group') ? {x:0,y:0} : getAnchorOffsetInBaseCoords(item, currentAnchorPoint);
                    item.x = mouseBasePos.x - offsetInfo.offsetX - itemAnchorOffset.x;
                    item.y = mouseBasePos.y - offsetInfo.offsetY - itemAnchorOffset.y;
                    if(item.type === 'group') updateAllBoundingBoxes(item);
                }
            });
        }
        renderAllRectangles();
        if (primarySelectedBaseRect) updateInputFields(primarySelectedBaseRect);
    });

    document.addEventListener('mouseup', (event) => {
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
        if (justDragged) { justDragged = false; return; }
        const canvasRect = canvas.getBoundingClientRect();
        const clickX = (event.clientX - canvasRect.left); const clickY = (event.clientY - canvasRect.top);
        let clickedOnAnyItem = false;
        for (let i = baseRectangles.length - 1; i >= 0; i--) {
            const item = baseRectangles[i];
            if (item.domElement) {
                 const itemLeftPx = parseFloat(item.domElement.style.left); const itemTopPx = parseFloat(item.domElement.style.top);
                 const itemWidthPx = parseFloat(item.domElement.style.width); const itemHeightPx = parseFloat(item.domElement.style.height);
                if (clickX >= itemLeftPx && clickX <= itemLeftPx + itemWidthPx && clickY >= itemTopPx && clickY <= itemTopPx + itemHeightPx) {
                    clickedOnAnyItem = true; break;
                }
            }
        }
        if (!clickedOnAnyItem) deselectAllRectangles();
    });

    [rectXInput, rectYInput, rectWidthInput, rectHeightInput].forEach(input => {
        input.addEventListener('input', () => {
            if (primarySelectedBaseRect) {
                const itemToUpdate = primarySelectedBaseRect; let value = parseFloat(input.value);
                const oldProps = { x: itemToUpdate.x, y: itemToUpdate.y, w: itemToUpdate.w, h: itemToUpdate.h };
                if (input === rectXInput && !isNaN(value)) {
                    const newAnchorX = value; const anchorOffset = getAnchorOffsetInBaseCoords(itemToUpdate, currentAnchorPoint);
                    itemToUpdate.x = newAnchorX - anchorOffset.x;
                    if (itemToUpdate.type === 'group') {
                        const deltaX = itemToUpdate.x - oldProps.x;
                        const leafMembers = []; getAllLeafMembers(itemToUpdate, leafMembers);
                        leafMembers.forEach(m => m.x += deltaX); updateAllBoundingBoxes(itemToUpdate);
                    }
                } else if (input === rectYInput && !isNaN(value)) {
                    const newAnchorY = value; const anchorOffset = getAnchorOffsetInBaseCoords(itemToUpdate, currentAnchorPoint);
                    itemToUpdate.y = newAnchorY - anchorOffset.y;
                     if (itemToUpdate.type === 'group') {
                        const deltaY = itemToUpdate.y - oldProps.y;
                        const leafMembers = []; getAllLeafMembers(itemToUpdate, leafMembers);
                        leafMembers.forEach(m => m.y += deltaY); updateAllBoundingBoxes(itemToUpdate);
                    }
                } else if (input === rectWidthInput && !isNaN(value)) {
                    value = Math.max(0, value); input.value = value;
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
                } else if (input === rectHeightInput && !isNaN(value)) {
                    value = Math.max(0, value); input.value = value;
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
        });
        input.addEventListener('keypress', (event) => {
            const charCode = (event.which) ? event.which : event.keyCode;
            if (charCode > 31 && (charCode < 48 || charCode > 57) && charCode !== 46 && charCode !== 45) {event.preventDefault(); return;}
            const kValue = event.target.value;
            if (charCode === 46 && kValue.includes('.')) { event.preventDefault(); return; }
            if (charCode === 45) { if (!(input === rectXInput || input === rectYInput) || kValue.length > 0 || kValue.includes('-')) { event.preventDefault(); return;}}
        });
    });

    updateInputFields(null); // Initial call

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
        }
    });

    saveBtn.addEventListener('click', () => {
        const dataToSave = baseRectangles.map(item => {
            const plainItem = { id: item.id, type: item.type, x: item.x, y: item.y, w: item.w, h: item.h, zIndex: item.zIndex, parentId: item.parentId };
            if (item.type === 'group') plainItem.members = item.members.map(member => member.id);
            return plainItem;
        });
        const editorData = { canvasObjects: dataToSave, settings: { rectCounter, groupCounter, currentHighestZIndex, logicalZoom } };
        const jsonString = JSON.stringify(editorData, null, 2);
        console.log("Mentett adatok:", jsonString);
        const blob = new Blob([jsonString], {type: 'application/json'});
        const url = URL.createObjectURL(blob); const a = document.createElement('a');
        a.href = url; a.download = 'canvas_layout.json'; document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    });

    loadBtn.addEventListener('click', () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file'; fileInput.accept = '.json,application/json';
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0]; if (!file) return;
            if (!file.name.toLowerCase().endsWith('.json')) { alert('Kérlek, .json kiterjesztésű fájlt válassz!'); return; }
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileContent = e.target.result;
                try {
                    const loadedData = JSON.parse(fileContent);
                    if (loadedData && loadedData.canvasObjects && Array.isArray(loadedData.canvasObjects)) {
                        clearCanvas();
                        if(loadedData.settings){
                            rectCounter = loadedData.settings.rectCounter || 0; groupCounter = loadedData.settings.groupCounter || 0;
                            currentHighestZIndex = loadedData.settings.currentHighestZIndex || 1; logicalZoom = loadedData.settings.logicalZoom || 1.0;
                        }
                        const itemMap = new Map(); baseRectangles = [];
                        loadedData.canvasObjects.forEach(itemData => {
                            let newItem;
                            if (itemData.type === 'rectangle') {
                                const domEl = document.createElement('div'); domEl.id = itemData.id; domEl.classList.add('rectangle'); canvas.appendChild(domEl);
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
                                    if (memberInstance && !item.members.includes(memberInstance)) item.addMember(memberInstance);
                                });
                            } else if (itemData.parentId && item.parentId !== itemData.parentId && itemMap.has(itemData.parentId)) item.parentId = itemData.parentId;
                        });
                        renderAllRectangles(); updateZoomDisplay();
                         if (baseRectangles.length > 0) {
                            let topItem = null; let highestZ = -Infinity;
                            baseRectangles.filter(it => it.parentId === null).forEach(br => { if (br.zIndex > highestZ) { highestZ = br.zIndex; topItem = br; } });
                            if (topItem) {
                                if (topItem.domElement) selectRectangle(topItem.domElement);
                                else {
                                    primarySelectedBaseRect = topItem;
                                    if(topItem.type === 'group') {
                                        topItem.createOrUpdateDomElement(canvas, logicalZoom);
                                        if(topItem.domElement) {
                                            selectedRectsDOM = [topItem.domElement]; topItem.domElement.classList.add('selected');
                                            topItem.domElement.addEventListener('mousedown', handleItemMouseDown);
                                        }
                                    }
                                    updateInputFields(primarySelectedBaseRect);
                                }
                            }
                        } else { updateInputFields(null); }
                    } else { alert("Érvénytelen JSON formátum."); }
                } catch (error) { alert("Hiba a JSON fájl feldolgozásakor: " + error.message); console.error("JSON Parse Error:", error); }
            };
            reader.onerror = (e) => { alert("Hiba a fájl olvasásakor."); console.error("File Read Error:", e); };
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
            rectElement.id = newId; 
            rectElement.classList.add('rectangle');
            
            newItem = new CanvasRectangle(newId, newX, newY, originalItem.w, originalItem.h, currentHighestZIndex, rectElement, newParentIdForMembers);
            baseRectangles.push(newItem); 
            canvas.appendChild(rectElement);
            rectElement.addEventListener('mousedown', handleItemMouseDown);
        } else if (originalItem.type === 'group') {
            const newId = `group-${groupCounter++}`;
            newItem = new CanvasGroup(newId, newParentIdForMembers);
            newItem.zIndex = currentHighestZIndex;
    
            originalItem.members.forEach(member => {
                const duplicatedMember = duplicateItemRecursive(member, newItem.id, xOffset, yOffset); 
                newItem.addMember(duplicatedMember); 
            });
            newItem.calculateBoundingBox(); 
            baseRectangles.push(newItem);
            newItem.createOrUpdateDomElement(canvas, logicalZoom); 
            if (newItem.domElement) {
                newItem.domElement.addEventListener('mousedown', handleItemMouseDown);
            }
        }
        return newItem;
    }    

    duplicateRectBtn.addEventListener('click', () => {
        let itemsToDuplicateSource = [];
        if (selectedRectsDOM.length > 0) {
            itemsToDuplicateSource = selectedRectsDOM.map(domEl => 
                baseRectangles.find(br => br.domElement === domEl)
            ).filter(instance => instance); 
        } else if (primarySelectedBaseRect) { 
            itemsToDuplicateSource = [primarySelectedBaseRect];
        }

        if (itemsToDuplicateSource.length === 0) return; 
        
        deselectAllRectanglesStyling(); 
        selectedRectsDOM = []; 
        
        const newTopLevelItems = [];
        itemsToDuplicateSource.forEach(itemToDuplicate => {
            const newDuplicatedItem = duplicateItemRecursive(itemToDuplicate, null, 10, 10);
            if (newDuplicatedItem) {
                newTopLevelItems.push(newDuplicatedItem);
            }
        });

        let newPrimarySelection = null;
        if (newTopLevelItems.length > 0) {
            newPrimarySelection = newTopLevelItems[0]; 
            newTopLevelItems.forEach(item => {
                if (item.domElement) { 
                    selectedRectsDOM.push(item.domElement);
                    item.domElement.classList.add('selected');
                } else if (item.type === 'group' && !item.domElement) {
                    console.warn("Duplicated group has no DOM element for selection styling:", item.id);
                }
            });
        }
        primarySelectedBaseRect = newPrimarySelection;
        updateInputFields(primarySelectedBaseRect);
        renderAllRectangles();
    });

    // MODIFIED LISTENERS
    rotateCwBtn.addEventListener('click', () => swapSelectedRectangleDimensions('cw')); 
    rotateCcwBtn.addEventListener('click', () => swapSelectedRectangleDimensions('ccw')); 

    canvas.addEventListener('wheel', (event) => {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
        let newLogicalZoom = logicalZoom + delta;
        newLogicalZoom = Math.max(MIN_ZOOM, newLogicalZoom); newLogicalZoom = Math.min(MAX_ZOOM, newLogicalZoom);
        if (newLogicalZoom === logicalZoom) return;
        logicalZoom = newLogicalZoom; canvas.style.backgroundSize = `${10 * logicalZoom}px ${10 * logicalZoom}px`;
        renderAllRectangles(); updateZoomDisplay();
    });

    resetZoomBtn.addEventListener('click', () => {
        logicalZoom = 1.0; canvas.style.backgroundSize = `${10 * logicalZoom}px ${10 * logicalZoom}px`;
        updateZoomDisplay(); renderAllRectangles();
    });

    const zoomPercentages = [25, 50, 75, 100, 125, 150, 200, 400];
    zoomPercentages.forEach(percentage => {
        const option = document.createElement('option');
        option.value = percentage / 100; option.textContent = `${percentage}%`;
        if (zoomLevelSelect) zoomLevelSelect.appendChild(option);
    });
    updateZoomDisplay();

    const anchorRadioButtons = document.querySelectorAll('input[name="anchor-point"]');
    anchorRadioButtons.forEach(radio => {
        radio.addEventListener('change', (event) => {
            currentAnchorPoint = event.target.value;
            if (primarySelectedBaseRect) updateInputFields(primarySelectedBaseRect);
        });
    });

    zoomLevelSelect.addEventListener('change', (event) => {
        const newLogicalZoom = parseFloat(event.target.value);
        if (!isNaN(newLogicalZoom) && newLogicalZoom >= MIN_ZOOM && newLogicalZoom <= MAX_ZOOM) {
            logicalZoom = newLogicalZoom; canvas.style.backgroundSize = `${10 * logicalZoom}px ${10 * logicalZoom}px`;
            renderAllRectangles(); updateZoomDisplay(); 
        }
    });

    document.addEventListener('keydown', (event) => {
        const activeTagName = document.activeElement ? document.activeElement.tagName : null;
        const isInputFocused = activeTagName === 'INPUT' || activeTagName === 'TEXTAREA';
        if (event.ctrlKey) {
            if (event.key === 'c' || event.key === 'C') {
                if (isInputFocused) return;
                if (duplicateRectBtn.style.display !== 'none') duplicateRectBtn.click();
                event.preventDefault();
            } else if (event.key === 's' || event.key === 'S') {
                saveBtn.click(); event.preventDefault();
            } else if (event.key === 'r' || event.key === 'R') {
                resetBtn.click(); event.preventDefault();
            } else if (event.key === 'd' || event.key === 'D') {
                if (isInputFocused) return;
                if (deleteRectBtn.style.display !== 'none') deleteRectBtn.click();
                event.preventDefault();
            }
        } else {
            if (event.key === 'Delete') {
                if (isInputFocused) return;
                if (deleteRectBtn.style.display !== 'none') deleteRectBtn.click();
                event.preventDefault();
            }
        }
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
            newGroup.createOrUpdateDomElement(canvas, logicalZoom);
            if (newGroup.domElement) {
                selectedRectsDOM.push(newGroup.domElement);
                newGroup.domElement.classList.add('selected');
                newGroup.domElement.addEventListener('mousedown', handleItemMouseDown);
            }
            primarySelectedBaseRect = newGroup;
            updateInputFields(primarySelectedBaseRect); renderAllRectangles();
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
                if (member.domElement) {
                    selectedRectsDOM.push(member.domElement);
                    member.domElement.classList.add('selected');
                }
            });
            primarySelectedBaseRect = membersToRelease.length > 0 ? membersToRelease[0] : null;
            updateInputFields(primarySelectedBaseRect); renderAllRectangles();
        }
    });
});
