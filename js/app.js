/* =========================================================
   PDFtoPic — main application
   Alat: PDF → Gambar, Gambar → PDF, Gabung PDF, Pisah PDF
   ========================================================= */

(() => {
  'use strict';

  const MAX_BYTES = 50 * 1024 * 1024;
  const THUMB_TARGET = 300;
  const MAX_PAGE_PIXELS = 50000000;
  const ZIP_WORKER_PATH = 'js/zip-worker.js';
  const A4_SHORT = 595.28;
  const A4_LONG = 841.89;

  const ICON_UP =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>';
  const ICON_DOWN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>';
  const ICON_TRASH =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" /></svg>';

  const el = {
    uploadView: document.getElementById('uploadView'),
    workspaceView: document.getElementById('workspaceView'),
    imageWorkspaceView: document.getElementById('imageWorkspaceView'),
    mergeWorkspaceView: document.getElementById('mergeWorkspaceView'),
    splitWorkspaceView: document.getElementById('splitWorkspaceView'),
    progressView: document.getElementById('progressView'),
    successView: document.getElementById('successView'),

    toolTabs: Array.from(document.querySelectorAll('.tool-tab')),
    toolPanels: Array.from(document.querySelectorAll('.tool-panel')),

    dropzone: document.getElementById('dropzone'),
    imageDropzone: document.getElementById('imageDropzone'),
    mergeDropzone: document.getElementById('mergeDropzone'),
    splitDropzone: document.getElementById('splitDropzone'),

    fileInput: document.getElementById('fileInput'),
    imageInput: document.getElementById('imageInput'),
    mergeInput: document.getElementById('mergeInput'),
    splitInput: document.getElementById('splitInput'),
    unsupportedNotice: document.getElementById('unsupportedNotice'),

    backBtn: document.getElementById('backBtn'),
    fileName: document.getElementById('fileName'),
    fileMeta: document.getElementById('fileMeta'),
    loadBadge: document.getElementById('loadBadge'),
    loadBadgeText: document.getElementById('loadBadgeText'),

    workspaceHeading: document.getElementById('workspaceHeading'),
    thumbGrid: document.getElementById('thumbGrid'),
    selectionInfo: document.getElementById('selectionInfo'),
    selectAllBtn: document.getElementById('selectAllBtn'),
    selectNoneBtn: document.getElementById('selectNoneBtn'),

    selectedCount: document.getElementById('selectedCount'),
    outputSummary: document.getElementById('outputSummary'),
    convertBtn: document.getElementById('convertBtn'),

    imageWorkspaceHeading: document.getElementById('imageWorkspaceHeading'),
    imageBackBtn: document.getElementById('imageBackBtn'),
    imageGrid: document.getElementById('imageGrid'),
    imageInfo: document.getElementById('imageInfo'),
    imageAddBtn: document.getElementById('imageAddBtn'),
    imageClearBtn: document.getElementById('imageClearBtn'),
    imageCount: document.getElementById('imageCount'),
    imageSummary: document.getElementById('imageSummary'),
    imageConvertBtn: document.getElementById('imageConvertBtn'),

    mergeWorkspaceHeading: document.getElementById('mergeWorkspaceHeading'),
    mergeBackBtn: document.getElementById('mergeBackBtn'),
    mergeList: document.getElementById('mergeList'),
    mergeInfo: document.getElementById('mergeInfo'),
    mergeAddBtn: document.getElementById('mergeAddBtn'),
    mergeClearBtn: document.getElementById('mergeClearBtn'),
    mergeFileCount: document.getElementById('mergeFileCount'),
    mergePageCount: document.getElementById('mergePageCount'),
    mergeCount: document.getElementById('mergeCount'),
    mergeSummary: document.getElementById('mergeSummary'),
    mergeConvertBtn: document.getElementById('mergeConvertBtn'),

    splitWorkspaceHeading: document.getElementById('splitWorkspaceHeading'),
    splitBackBtn: document.getElementById('splitBackBtn'),
    splitFileName: document.getElementById('splitFileName'),
    splitFileMeta: document.getElementById('splitFileMeta'),
    splitBadge: document.getElementById('splitBadge'),
    splitBadgeText: document.getElementById('splitBadgeText'),
    splitGrid: document.getElementById('splitGrid'),
    splitSelectionInfo: document.getElementById('splitSelectionInfo'),
    splitSelectAllBtn: document.getElementById('splitSelectAllBtn'),
    splitSelectNoneBtn: document.getElementById('splitSelectNoneBtn'),
    splitSelectedCount: document.getElementById('splitSelectedCount'),
    splitOutputSummary: document.getElementById('splitOutputSummary'),
    splitConvertBtn: document.getElementById('splitConvertBtn'),

    progressTitle: document.getElementById('progressTitle'),
    progressStatus: document.getElementById('progressStatus'),
    progressTrack: document.getElementById('progressTrack'),
    progressBar: document.getElementById('progressBar'),
    progressPercent: document.getElementById('progressPercent'),
    cancelBtn: document.getElementById('cancelBtn'),

    successTitle: document.getElementById('successTitle'),
    successText: document.getElementById('successText'),
    successFilename: document.getElementById('successFilename'),
    downloadBtn: document.getElementById('downloadBtn'),
    newConversionBtn: document.getElementById('newConversionBtn'),

    toast: document.getElementById('toast'),
    toastText: document.getElementById('toastText'),
    toastClose: document.getElementById('toastClose')
  };

  const ui = {
    tool: 'pdfToImage',
    supported: true,
    pdfLib: false,
    resultUrl: null,
    resultName: '',
    toastTimer: null,
    autoTimer: null,
    zipJob: null,
    idSeq: 0
  };

  const progress = {
    tool: null,
    cancelled: false,
    activeRenderTask: null
  };

  const pdfState = {
    file: null,
    doc: null,
    pdfTask: null,
    session: 0,
    numPages: 0,
    selected: new Set(),
    thumbUrls: new Set(),
    format: 'png',
    quality: 72,
    loaded: false,
    thumbsDone: false,
    busy: false
  };

  const imageState = {
    items: [],
    pageSize: 'a4',
    busy: false
  };

  const mergeState = {
    files: [],
    busy: false
  };

  const splitState = {
    file: null,
    bytes: null,
    doc: null,
    pdfTask: null,
    session: 0,
    numPages: 0,
    selected: new Set(),
    thumbUrls: new Set(),
    mode: 'single',
    loaded: false,
    thumbsDone: false,
    busy: false
  };

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */

  init();

  function init() {
    ui.supported = detectSupport();
    ui.pdfLib = detectPdfLib();

    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'vendor/pdf.worker.min.js',
        document.baseURI
      ).href;
    }

    if (!ui.supported) {
      el.unsupportedNotice.hidden = false;
      el.dropzone.setAttribute('aria-disabled', 'true');
    }

    if (!ui.pdfLib) {
      el.toolTabs.forEach((tab) => {
        if (tab.dataset.tool !== 'pdfToImage') {
          tab.disabled = true;
          tab.title = 'Pustaka PDF belum termuat';
        }
      });
    }

    bindToolEvents();
    bindUploadEvents();
    bindPdfWorkspaceEvents();
    bindImageWorkspaceEvents();
    bindMergeWorkspaceEvents();
    bindSplitWorkspaceEvents();
    bindProgressEvents();
    bindSuccessEvents();
    bindGlobalEvents();

    setTool('pdfToImage');
    updatePdfSelectionUI();
    updateImageUI();
    updateMergeUI();
    updateSplitUI();
  }

  function detectSupport() {
    return (
      typeof window.Worker === 'function' &&
      typeof window.pdfjsLib !== 'undefined' &&
      typeof window.HTMLCanvasElement === 'function' &&
      typeof window.HTMLCanvasElement.prototype.toBlob === 'function'
    );
  }

  function detectPdfLib() {
    return typeof window.PDFLib !== 'undefined' && !!window.PDFLib.PDFDocument;
  }

  function nextId() {
    ui.idSeq += 1;
    return ui.idSeq;
  }

  /* ---------------------------------------------------------
     Tool tabs
     --------------------------------------------------------- */

  function bindToolEvents() {
    el.toolTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        if (tab.disabled) return;
        setTool(tab.dataset.tool);
      });
    });
  }

  function setTool(tool) {
    ui.tool = tool;

    el.toolTabs.forEach((tab) => {
      const active = tab.dataset.tool === tool;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });

    el.toolPanels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tool;
    });

    clearDragStyles();
  }

  function activeDropzone() {
    switch (ui.tool) {
      case 'imageToPdf':
        return el.imageDropzone;
      case 'merge':
        return el.mergeDropzone;
      case 'split':
        return el.splitDropzone;
      default:
        return el.dropzone;
    }
  }

  /* ---------------------------------------------------------
     Event binding — upload
     --------------------------------------------------------- */

  function bindUploadEvents() {
    bindDropzone(el.dropzone, () => openPicker(el.fileInput));
    bindDropzone(el.imageDropzone, () => openPicker(el.imageInput));
    bindDropzone(el.mergeDropzone, () => openPicker(el.mergeInput));
    bindDropzone(el.splitDropzone, () => openPicker(el.splitInput));

    el.fileInput.addEventListener('change', () => {
      const file = el.fileInput.files && el.fileInput.files[0];
      el.fileInput.value = '';

      if (file) beginPdfToImage(file);
    });

    el.imageInput.addEventListener('change', () => {
      const files = el.imageInput.files ? Array.from(el.imageInput.files) : [];
      el.imageInput.value = '';
      if (files.length) addImages(files);
    });

    el.mergeInput.addEventListener('change', () => {
      const files = el.mergeInput.files ? Array.from(el.mergeInput.files) : [];
      el.mergeInput.value = '';
      if (files.length) addMergeFiles(files);
    });

    el.splitInput.addEventListener('change', () => {
      const file = el.splitInput.files && el.splitInput.files[0];
      el.splitInput.value = '';
      if (file) beginSplit(file);
    });

    el.backBtn.addEventListener('click', () => openPicker(el.fileInput));
  }

  function bindDropzone(node, onActivate) {
    node.addEventListener('click', onActivate);
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate();
      }
    });
  }

  function openPicker(input) {
    if (!ui.supported) {
      showToast('Browser Anda belum mendukung pemrosesan lokal. Silakan perbarui browser.');
      return;
    }

    if (input !== el.fileInput && !ui.pdfLib) {
      showToast('Pustaka PDF belum termuat. Muat ulang halaman lalu coba lagi.');
      return;
    }

    input.value = '';
    input.click();
  }

  /* ---------------------------------------------------------
     Event binding — workspaces
     --------------------------------------------------------- */

  function bindPdfWorkspaceEvents() {
    bindGrid(el.thumbGrid, pdfState.selected, updatePdfSelectionUI);

    el.selectAllBtn.addEventListener('click', () => {
      setAllPages(el.thumbGrid, pdfState.selected, pdfState.numPages, true);
      updatePdfSelectionUI();
    });

    el.selectNoneBtn.addEventListener('click', () => {
      setAllPages(el.thumbGrid, pdfState.selected, pdfState.numPages, false);
      updatePdfSelectionUI();
    });

    el.workspaceView.addEventListener('change', (event) => {
      const target = event.target;

      if (target.name === 'format') {
        pdfState.format = target.value === 'jpg' ? 'jpg' : 'png';
        updatePdfSelectionUI();
      }

      if (target.name === 'quality') {
        pdfState.quality = Number(target.value) === 300 ? 300 : 72;
        updatePdfSelectionUI();
      }
    });

    el.convertBtn.addEventListener('click', startPdfConversion);
  }

  function bindImageWorkspaceEvents() {
    el.imageBackBtn.addEventListener('click', () => openPicker(el.imageInput));
    el.imageAddBtn.addEventListener('click', () => openPicker(el.imageInput));

    el.imageClearBtn.addEventListener('click', () => {
      resetImages();
      updateImageUI();
    });

    el.imageGrid.addEventListener('click', (event) => {
      const button = event.target.closest('.icon-btn');
      if (!button) return;

      const card = button.closest('.image-card');
      if (!card) return;

      const id = Number(card.dataset.id);
      const index = imageState.items.findIndex((item) => item.id === id);
      if (index < 0) return;

      const action = button.dataset.action;

      if (action === 'remove') {
        const [removed] = imageState.items.splice(index, 1);
        if (removed) URL.revokeObjectURL(removed.url);
      } else if (action === 'up' && index > 0) {
        swapItems(imageState.items, index, index - 1);
      } else if (action === 'down' && index < imageState.items.length - 1) {
        swapItems(imageState.items, index, index + 1);
      }

      renderImageGrid();
      updateImageUI();
    });

    el.imageWorkspaceView.addEventListener('change', (event) => {
      if (event.target.name === 'pageSize') {
        imageState.pageSize = event.target.value === 'fit' ? 'fit' : 'a4';
        updateImageUI();
      }
    });

    el.imageConvertBtn.addEventListener('click', startImageConversion);
  }

  function bindMergeWorkspaceEvents() {
    el.mergeBackBtn.addEventListener('click', () => openPicker(el.mergeInput));
    el.mergeAddBtn.addEventListener('click', () => openPicker(el.mergeInput));

    el.mergeClearBtn.addEventListener('click', () => {
      resetMerge();
      updateMergeUI();
    });

    el.mergeList.addEventListener('click', (event) => {
      const button = event.target.closest('.icon-btn');
      if (!button) return;

      const row = button.closest('.file-row');
      if (!row) return;

      const id = Number(row.dataset.id);
      const index = mergeState.files.findIndex((file) => file.id === id);
      if (index < 0) return;

      const action = button.dataset.action;

      if (action === 'remove') {
        mergeState.files.splice(index, 1);
      } else if (action === 'up' && index > 0) {
        swapItems(mergeState.files, index, index - 1);
      } else if (action === 'down' && index < mergeState.files.length - 1) {
        swapItems(mergeState.files, index, index + 1);
      }

      renderMergeList();
      updateMergeUI();
    });

    el.mergeConvertBtn.addEventListener('click', startMergeConversion);
  }

  function bindSplitWorkspaceEvents() {
    el.splitBackBtn.addEventListener('click', () => openPicker(el.splitInput));

    bindGrid(el.splitGrid, splitState.selected, updateSplitUI);

    el.splitSelectAllBtn.addEventListener('click', () => {
      setAllPages(el.splitGrid, splitState.selected, splitState.numPages, true);
      updateSplitUI();
    });

    el.splitSelectNoneBtn.addEventListener('click', () => {
      setAllPages(el.splitGrid, splitState.selected, splitState.numPages, false);
      updateSplitUI();
    });

    el.splitWorkspaceView.addEventListener('change', (event) => {
      if (event.target.name === 'splitMode') {
        splitState.mode = event.target.value === 'each' ? 'each' : 'single';
        updateSplitUI();
      }
    });

    el.splitConvertBtn.addEventListener('click', startSplitConversion);
  }

  function bindProgressEvents() {
    el.cancelBtn.addEventListener('click', cancelJob);
  }

  function bindSuccessEvents() {
    el.downloadBtn.addEventListener('click', () => {
      if (ui.resultUrl) {
        triggerDownload(ui.resultUrl, ui.resultName);
      }
    });

    el.newConversionBtn.addEventListener('click', resetAll);
  }

  function bindGlobalEvents() {
    el.toastClose.addEventListener('click', hideToast);

    document.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    });

    document.addEventListener('dragenter', (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();

      if (!el.uploadView.hidden) {
        activeDropzone().classList.add('is-dragover');
      }
    });

    document.addEventListener('dragleave', (event) => {
      if (!hasFiles(event)) return;

      if (event.relatedTarget === null) {
        clearDragStyles();
      }
    });

    document.addEventListener('drop', (event) => {
      event.preventDefault();
      clearDragStyles();

      const files = event.dataTransfer && event.dataTransfer.files;

      if (!files || files.length === 0) return;
      if (el.uploadView.hidden) return;

      handleDroppedFiles(files);
    });
  }

  function clearDragStyles() {
    [el.dropzone, el.imageDropzone, el.mergeDropzone, el.splitDropzone].forEach((zone) => {
      zone.classList.remove('is-dragover');
    });
  }

  function hasFiles(event) {
    const types = event.dataTransfer && event.dataTransfer.types;
    return types ? Array.from(types).includes('Files') : false;
  }

  function handleDroppedFiles(files) {
    const list = Array.from(files);

    if (ui.tool === 'imageToPdf') {
      addImages(list);
      return;
    }

    if (ui.tool === 'merge') {
      addMergeFiles(list);
      return;
    }

    if (list.length > 1) {
      showToast('Pilih satu file PDF dalam satu waktu.');
      return;
    }

    if (ui.tool === 'split') {
      beginSplit(list[0]);
    } else {
      beginPdfToImage(list[0]);
    }
  }

  /* ---------------------------------------------------------
     Validation & helpers
     --------------------------------------------------------- */

  function validatePdf(file) {
    if (!file) return 'Tidak ada file yang dipilih.';

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

    if (!isPdf) return 'Hanya file PDF yang didukung. Silakan pilih file dengan ekstensi .pdf.';
    if (file.size === 0) return 'File PDF kosong dan tidak dapat diproses.';
    if (file.size > MAX_BYTES) return 'Ukuran file terlalu besar. Maksimal 50 MB per file.';

    return null;
  }

  function validateImage(file) {
    if (!file) return 'Tidak ada file yang dipilih.';

    const isImage =
      file.type === 'image/png' ||
      file.type === 'image/jpeg' ||
      /\.(png|jpe?g)$/i.test(file.name);

    if (!isImage) return 'hanya PNG atau JPG yang didukung.';
    if (file.size === 0) return 'file gambar kosong.';
    if (file.size > MAX_BYTES) return 'ukuran melebihi 50 MB.';

    return null;
  }

  function describePdfError(error) {
    const name = error && error.name;

    if (name === 'PasswordException') {
      return 'PDF ini dilindungi kata sandi. Silakan buka proteksinya terlebih dahulu, lalu coba lagi.';
    }

    if (name === 'InvalidPDFException') {
      return 'File PDF tidak valid atau rusak sehingga tidak dapat dibaca.';
    }

    if (name === 'MissingPDFException') {
      return 'File PDF tidak ditemukan. Coba pilih ulang file Anda.';
    }

    return 'PDF tidak dapat dibuka. Pastikan file tidak rusak, lalu coba lagi.';
  }

  function swapItems(list, a, b) {
    const temp = list[a];
    list[a] = list[b];
    list[b] = temp;
  }

  /* ---------------------------------------------------------
     PDF → Gambar: load & thumbnails
     --------------------------------------------------------- */

  async function beginPdfToImage(file) {
    if (!ui.supported) {
      showToast('Browser Anda belum mendukung pemrosesan lokal. Silakan perbarui browser.');
      return;
    }

    const validationError = validatePdf(file);

    if (validationError) {
      showToast(validationError);
      return;
    }

    releasePdfResources();

    const session = pdfState.session;

    pdfState.file = file;
    pdfState.loaded = false;
    pdfState.thumbsDone = false;
    pdfState.busy = false;

    el.fileName.textContent = file.name;
    el.fileName.title = file.name;
    el.fileMeta.textContent = formatBytes(file.size);
    el.selectionInfo.textContent = 'Menyiapkan pratinjau…';
    el.thumbGrid.innerHTML = '';
    setThumbLoading(el.thumbGrid, 'Membaca dokumen…');
    setBadge(el.loadBadge, el.loadBadgeText, 'Memuat…', 'loading');
    updatePdfSelectionUI();
    showView('workspace');

    let buffer;

    try {
      buffer = await file.arrayBuffer();
    } catch (error) {
      if (session !== pdfState.session) return;
      showToast('File tidak dapat dibaca. Silakan pilih ulang file Anda.');
      resetPdf();
      return;
    }

    if (session !== pdfState.session) return;

    try {
      const task = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        isEvalSupported: false,
        useSystemFonts: true
      });

      pdfState.pdfTask = task;
      const doc = await task.promise;

      if (session !== pdfState.session) {
        doc.destroy();
        return;
      }

      pdfState.doc = doc;
      pdfState.numPages = doc.numPages;
      pdfState.loaded = true;

      el.fileMeta.textContent = `${formatBytes(file.size)} · ${doc.numPages} halaman`;
      setBadge(el.loadBadge, el.loadBadgeText, 'Menyiapkan pratinjau…', 'loading');

      buildPageGrid(el.thumbGrid, doc.numPages, pdfState.selected);
      updatePdfSelectionUI();

      await generateThumbnails(
        doc,
        el.thumbGrid,
        pdfState.thumbUrls,
        () => session !== pdfState.session,
        () => {
          pdfState.thumbsDone = true;
          setBadge(el.loadBadge, el.loadBadgeText, `${pdfState.numPages} halaman`, 'ready');
          updatePdfSelectionUI();
        }
      );
    } catch (error) {
      if (session !== pdfState.session) return;
      resetPdf();
      showToast(describePdfError(error));
    }
  }

  function releasePdfResources() {
    pdfState.session += 1;

    if (progress.activeRenderTask) {
      try {
        progress.activeRenderTask.cancel();
      } catch (error) {
        /* ignore */
      }
      progress.activeRenderTask = null;
    }

    if (pdfState.pdfTask) {
      try {
        pdfState.pdfTask.destroy();
      } catch (error) {
        /* ignore */
      }
      pdfState.pdfTask = null;
    }

    if (pdfState.doc) {
      try {
        pdfState.doc.destroy();
      } catch (error) {
        /* ignore */
      }
      pdfState.doc = null;
    }

    pdfState.thumbUrls.forEach((url) => URL.revokeObjectURL(url));
    pdfState.thumbUrls.clear();

    pdfState.numPages = 0;
    pdfState.loaded = false;
    pdfState.thumbsDone = false;
    pdfState.busy = false;
    pdfState.selected.clear();
  }

  function resetPdf() {
    releasePdfResources();
    pdfState.file = null;

    el.fileName.textContent = 'dokumen.pdf';
    el.fileName.title = '';
    el.fileMeta.textContent = '—';
    el.thumbGrid.innerHTML = '';
    el.selectionInfo.textContent = 'Menyiapkan pratinjau…';
    setBadge(el.loadBadge, el.loadBadgeText, 'Memuat…', 'loading');

    updatePdfSelectionUI();
    showView('upload');
  }

  /* ---------------------------------------------------------
     Shared page grid (thumbnails + selection)
     --------------------------------------------------------- */

  function buildPageGrid(gridEl, numPages, selected) {
    selected.clear();

    const fragment = document.createDocumentFragment();

    for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
      selected.add(pageNumber);

      const card = document.createElement('label');
      card.className = 'page-card is-selected';
      card.dataset.page = String(pageNumber);

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'page-check';
      checkbox.checked = true;
      checkbox.setAttribute('aria-label', `Pilih halaman ${pageNumber}`);

      const thumb = document.createElement('span');
      thumb.className = 'page-thumb';
      thumb.innerHTML =
        '<span class="thumb-skeleton" aria-hidden="true"></span><img alt="" hidden />';

      const number = document.createElement('span');
      number.className = 'page-num';
      number.textContent = String(pageNumber);

      const mark = document.createElement('span');
      mark.className = 'page-checkmark';
      mark.setAttribute('aria-hidden', 'true');
      mark.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10" /></svg>';

      card.append(checkbox, thumb, number, mark);
      fragment.appendChild(card);
    }

    gridEl.replaceChildren(fragment);
  }

  function bindGrid(gridEl, selected, onChange) {
    gridEl.addEventListener('change', (event) => {
      const checkbox = event.target.closest('.page-check');
      if (!checkbox) return;

      const card = checkbox.closest('.page-card');
      const pageNumber = Number(card.dataset.page);

      if (checkbox.checked) {
        selected.add(pageNumber);
      } else {
        selected.delete(pageNumber);
      }

      card.classList.toggle('is-selected', checkbox.checked);
      onChange();
    });
  }

  function setAllPages(gridEl, selected, numPages, isSelected) {
    if (isSelected) {
      for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
        selected.add(pageNumber);
      }
    } else {
      selected.clear();
    }

    gridEl.querySelectorAll('.page-check').forEach((checkbox) => {
      checkbox.checked = isSelected;
      const card = checkbox.closest('.page-card');
      if (card) card.classList.toggle('is-selected', isSelected);
    });
  }

  function setThumbLoading(gridEl, text) {
    const wrapper = document.createElement('div');
    wrapper.className = 'thumb-loading';

    const spinner = document.createElement('span');
    spinner.className = 'spinner small';
    spinner.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.textContent = text;

    wrapper.append(spinner, label);
    gridEl.replaceChildren(wrapper);
  }

  async function generateThumbnails(doc, gridEl, thumbUrls, isStale, onDone) {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      if (isStale()) return;

      let thumbnail = null;

      try {
        thumbnail = await renderThumbnail(doc, pageNumber);
      } catch (error) {
        if (isStale()) return;
        handleThumbnailError(gridEl, pageNumber);
      }

      if (isStale()) return;

      if (thumbnail) {
        handleThumbnail(gridEl, thumbUrls, pageNumber, thumbnail);
      }

      await nextTask();
    }

    if (isStale()) return;
    onDone();
  }

  async function renderThumbnail(doc, pageNumber) {
    const page = await doc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });

    const scale = Math.min(
      THUMB_TARGET / baseViewport.width,
      THUMB_TARGET / baseViewport.height,
      1.6
    );

    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.8);

    page.cleanup();
    releaseCanvas(canvas);

    return { blob, width, height };
  }

  function handleThumbnail(gridEl, thumbUrls, pageNumber, message) {
    const card = gridEl.querySelector(`.page-card[data-page="${pageNumber}"]`);
    if (!card) return;

    const img = card.querySelector('img');
    const skeleton = card.querySelector('.thumb-skeleton');

    if (!img) return;

    const url = URL.createObjectURL(message.blob);
    thumbUrls.add(url);

    img.onload = () => {
      URL.revokeObjectURL(url);
      thumbUrls.delete(url);
      img.hidden = false;
      img.width = message.width || img.width;
      img.height = message.height || img.height;
      if (skeleton && skeleton.parentNode) skeleton.remove();
      card.classList.add('has-thumb');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      thumbUrls.delete(url);
    };

    img.alt = `Pratinjau halaman ${pageNumber}`;
    img.src = url;
  }

  function handleThumbnailError(gridEl, pageNumber) {
    const card = gridEl.querySelector(`.page-card[data-page="${pageNumber}"]`);
    if (!card) return;

    const thumb = card.querySelector('.page-thumb');
    if (!thumb) return;

    card.classList.add('has-thumb-error');
    thumb.innerHTML = '<span class="thumb-fallback">Pratinjau tidak tersedia</span>';
  }

  function updatePdfSelectionUI() {
    const count = pdfState.selected.size;
    const format = pdfState.format.toUpperCase();

    el.selectedCount.textContent =
      count === 0 ? 'Belum ada halaman dipilih' : `${count} halaman dipilih`;
    el.outputSummary.textContent = `${format} · ${pdfState.quality} DPI`;

    if (pdfState.numPages > 0) {
      el.selectionInfo.textContent = pdfState.thumbsDone
        ? `${count} dari ${pdfState.numPages} halaman dipilih`
        : `${count} dari ${pdfState.numPages} dipilih · memuat pratinjau…`;
    } else {
      el.selectionInfo.textContent = 'Menyiapkan pratinjau…';
    }

    el.selectAllBtn.disabled = !pdfState.loaded || count === pdfState.numPages;
    el.selectNoneBtn.disabled = !pdfState.loaded || count === 0;

    let label;

    if (!pdfState.loaded) {
      label = 'Memuat dokumen…';
    } else if (!pdfState.thumbsDone) {
      label = 'Menyiapkan pratinjau…';
    } else if (count === 0) {
      label = 'Pilih halaman dulu';
    } else {
      label = `Konversi ${count} halaman`;
    }

    el.convertBtn.textContent = label;
    el.convertBtn.disabled =
      !pdfState.loaded || !pdfState.thumbsDone || count === 0 || pdfState.busy;
  }

  /* ---------------------------------------------------------
     PDF → Gambar: conversion
     --------------------------------------------------------- */

  async function startPdfConversion() {
    if (!pdfState.loaded || !pdfState.thumbsDone || pdfState.busy || !pdfState.doc) return;

    const pages = Array.from(pdfState.selected).sort((a, b) => a - b);

    if (pages.length === 0) {
      showToast('Pilih minimal satu halaman untuk dikonversi.');
      return;
    }

    const session = pdfState.session;
    const format = pdfState.format === 'jpg' ? 'jpg' : 'png';
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const scale = pdfState.quality / 72;
    const baseName = baseNameOf(pdfState.file ? pdfState.file.name : 'dokumen');
    const padLength = Math.max(1, String(pdfState.numPages).length);

    pdfState.busy = true;
    startJob('pdfToImage', 'Mengonversi PDF…', `Menyiapkan ${pages.length} halaman…`);

    try {
      const files = [];

      for (let index = 0; index < pages.length; index += 1) {
        if (progress.cancelled || session !== pdfState.session) {
          finishCancelled();
          return;
        }

        const pageNumber = pages[index];
        const percent = (index / pages.length) * 85;

        setProgress(
          percent,
          `Memproses halaman ${pageNumber} · ${index + 1} dari ${pages.length}`
        );

        await nextPaint();

        const blob = await renderPageBlob(
          pageNumber,
          scale,
          mime,
          format === 'jpg' ? 0.92 : undefined
        );

        if (progress.cancelled || session !== pdfState.session) {
          finishCancelled();
          return;
        }

        const filename = `${baseName}-hal-${String(pageNumber).padStart(padLength, '0')}.${format}`;
        files.push({ name: filename, blob });

        setProgress(
          ((index + 1) / pages.length) * 85,
          `Halaman ${pageNumber} selesai · ${index + 1} dari ${pages.length}`
        );

        await nextTask();
      }

      if (files.length === 1) {
        pdfState.busy = false;
        handleResult(
          files[0].blob,
          files[0].name,
          `1 halaman berhasil dikonversi ke ${format.toUpperCase()}.`
        );
        return;
      }

      el.progressTitle.textContent = 'Menyiapkan unduhan…';
      setProgress(85, 'Membuat file ZIP · 0%');
      await nextPaint();

      const zipName = `${baseName}-${format.toUpperCase()}.zip`;
      const zipBlob = await zipFiles(files, zipName, (percent) => {
        if (session !== pdfState.session) return;
        setProgress(85 + percent * 0.15, `Membuat file ZIP · ${Math.round(percent)}%`);
      });

      if (progress.cancelled || session !== pdfState.session) {
        finishCancelled();
        return;
      }

      pdfState.busy = false;
      handleResult(
        zipBlob,
        zipName,
        `${files.length} halaman berhasil dikonversi ke ${format.toUpperCase()} dan digabung menjadi satu file ZIP.`
      );
    } catch (error) {
      if (
        progress.cancelled ||
        session !== pdfState.session ||
        (error && (error.name === 'RenderingCancelledException' || error.name === 'AbortError'))
      ) {
        if (pdfState.busy) finishCancelled();
        return;
      }

      console.error('[PDFtoPic]', error);
      pdfState.busy = false;
      progress.tool = null;
      showView('workspace');
      updatePdfSelectionUI();
      showToast('Konversi gagal. Coba lagi atau pilih lebih sedikit halaman.');
    }
  }

  async function renderPageBlob(pageNumber, scale, mime, quality) {
    const page = await pdfState.doc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });

    let finalScale = scale;
    const rawPixels = baseViewport.width * baseViewport.height * scale * scale;

    if (rawPixels > MAX_PAGE_PIXELS) {
      finalScale = scale * Math.sqrt(MAX_PAGE_PIXELS / rawPixels);
    }

    const viewport = page.getViewport({ scale: finalScale });
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    const renderTask = page.render({ canvasContext: context, viewport });
    progress.activeRenderTask = renderTask;

    try {
      await renderTask.promise;
    } finally {
      progress.activeRenderTask = null;
    }

    const blob = await canvasToBlob(canvas, mime, quality);

    page.cleanup();
    releaseCanvas(canvas);

    return blob;
  }

  /* ---------------------------------------------------------
     Gambar → PDF
     --------------------------------------------------------- */

  function addImages(fileList) {
    if (!ui.pdfLib) {
      showToast('Pustaka PDF belum termuat. Muat ulang halaman lalu coba lagi.');
      return;
    }

    const files = Array.from(fileList);
    const errors = [];
    let added = 0;

    files.forEach((file) => {
      const error = validateImage(file);

      if (error) {
        errors.push(`${file.name}: ${error}`);
        return;
      }

      const item = {
        id: nextId(),
        file,
        name: file.name,
        url: URL.createObjectURL(file),
        width: 0,
        height: 0,
        error: false
      };

      imageState.items.push(item);
      added += 1;
      loadImageDimensions(item);
    });

    if (added > 0) {
      renderImageGrid();
      updateImageUI();
      showView('imageWorkspace');
    }

    if (errors.length > 0) {
      const extra = errors.length > 1 ? ` (+${errors.length - 1} lainnya)` : '';
      showToast(errors[0] + extra);
    }
  }

  function loadImageDimensions(item) {
    const img = new Image();

    img.onload = () => {
      item.width = img.naturalWidth;
      item.height = img.naturalHeight;
      renderImageGrid();
      updateImageUI();
    };

    img.onerror = () => {
      item.error = true;
      renderImageGrid();
      updateImageUI();
    };

    img.src = item.url;
  }

  function renderImageGrid() {
    if (imageState.items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'Belum ada gambar. Tambahkan PNG atau JPG untuk mulai membuat PDF.';
      el.imageGrid.replaceChildren(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    imageState.items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.dataset.id = String(item.id);

      const thumb = document.createElement('div');
      thumb.className = 'image-thumb';

      const badge = document.createElement('span');
      badge.className = 'image-index';
      badge.textContent = String(index + 1);

      const img = document.createElement('img');
      img.src = item.url;
      img.alt = `Pratinjau ${item.name}`;
      img.loading = 'lazy';

      thumb.append(img, badge);

      const meta = document.createElement('div');
      meta.className = 'image-meta';

      const name = document.createElement('p');
      name.className = 'image-name';
      name.textContent = item.name;
      name.title = item.name;

      const sub = document.createElement('p');
      sub.className = 'image-sub';
      sub.textContent = item.error
        ? 'Tidak dapat dibaca'
        : `${item.width || '…'} × ${item.height || '…'} · ${formatBytes(item.file.size)}`;

      meta.append(name, sub);

      const actions = document.createElement('div');
      actions.className = 'image-actions';

      actions.append(
        makeIconButton('up', ICON_UP, 'Naikkan gambar', index === 0),
        makeIconButton('down', ICON_DOWN, 'Turunkan gambar', index === imageState.items.length - 1),
        makeIconButton('remove', ICON_TRASH, 'Hapus gambar', false, true)
      );

      card.append(thumb, meta, actions);
      fragment.appendChild(card);
    });

    el.imageGrid.replaceChildren(fragment);
  }

  function makeIconButton(action, icon, label, disabled, danger) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = danger ? 'icon-btn danger' : 'icon-btn';
    button.dataset.action = action;
    button.disabled = Boolean(disabled);
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = icon;
    return button;
  }

  function updateImageUI() {
    const count = imageState.items.length;
    const invalid = imageState.items.some((item) => item.error);
    const totalBytes = imageState.items.reduce((sum, item) => sum + item.file.size, 0);
    const sizeLabel = imageState.pageSize === 'fit' ? 'Sesuai gambar' : 'A4';

    el.imageCount.textContent = `${count} gambar`;
    el.imageSummary.textContent = `${sizeLabel} · PDF`;
    el.imageInfo.textContent = count
      ? `${count} gambar · ${formatBytes(totalBytes)}`
      : 'Belum ada gambar';
    el.imageClearBtn.disabled = count === 0;

    if (count === 0) {
      el.imageConvertBtn.textContent = 'Pilih gambar dulu';
    } else if (invalid) {
      el.imageConvertBtn.textContent = 'Ada gambar tidak valid';
    } else {
      el.imageConvertBtn.textContent = `Buat PDF (${count} halaman)`;
    }

    el.imageConvertBtn.disabled = count === 0 || invalid || imageState.busy;
  }

  async function startImageConversion() {
    if (!ui.pdfLib || imageState.busy || imageState.items.length === 0) return;

    const items = imageState.items.slice();

    if (items.some((item) => item.error)) {
      showToast('Ada gambar yang tidak dapat dibaca. Hapus gambar tersebut lalu coba lagi.');
      return;
    }

    imageState.busy = true;
    startJob('imageToPdf', 'Membuat PDF…', `Menyiapkan ${items.length} gambar…`);

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();

      for (let index = 0; index < items.length; index += 1) {
        if (progress.cancelled) {
          finishCancelled();
          return;
        }

        const item = items[index];

        setProgress(
          (index / items.length) * 95,
          `Menambahkan gambar ${index + 1} dari ${items.length}`
        );

        await nextPaint();

        const bytes = new Uint8Array(await item.file.arrayBuffer());
        const embedded = await embedImage(pdfDoc, bytes, item);

        addImagePage(pdfDoc, embedded);

        setProgress(
          ((index + 1) / items.length) * 95,
          `Gambar ${index + 1} selesai · ${index + 1} dari ${items.length}`
        );

        await nextTask();
      }

      if (progress.cancelled) {
        finishCancelled();
        return;
      }

      setProgress(97, 'Menyimpan PDF…');
      await nextPaint();

      const pdfBytes = await pdfDoc.save();

      if (progress.cancelled) {
        finishCancelled();
        return;
      }

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const base = baseNameOf(items[0].name);
      const filename =
        items.length === 1 ? `${base}.pdf` : `${base}-${items.length}-gambar.pdf`;

      imageState.busy = false;

      handleResult(
        blob,
        filename,
        items.length === 1
          ? 'Gambar berhasil diubah menjadi PDF.'
          : `${items.length} gambar berhasil digabung menjadi satu PDF.`
      );
    } catch (error) {
      if (progress.cancelled) {
        finishCancelled();
        return;
      }

      console.error('[PDFtoPic]', error);
      imageState.busy = false;
      progress.tool = null;
      showView('imageWorkspace');
      updateImageUI();
      showToast('Gagal membuat PDF. Pastikan gambar tidak rusak lalu coba lagi.');
    }
  }

  async function embedImage(pdfDoc, bytes, item) {
    const isPng = item.file.type === 'image/png' || /\.png$/i.test(item.name);

    try {
      return isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
    } catch (error) {
      const jpegBytes = await normalizeImageToJpeg(item);
      return pdfDoc.embedJpg(jpegBytes);
    }
  }

  async function normalizeImageToJpeg(item) {
    const img = await loadImageElement(item.url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, img.naturalWidth);
    canvas.height = Math.max(1, img.naturalHeight);

    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(img, 0, 0);

    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
    releaseCanvas(canvas);

    return new Uint8Array(await blob.arrayBuffer());
  }

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
      img.src = src;
    });
  }

  function addImagePage(pdfDoc, image) {
    const iw = image.width;
    const ih = image.height;

    if (imageState.pageSize === 'fit') {
      const maxSide = A4_LONG;
      const scale = Math.min(1, maxSide / Math.max(iw, ih));
      const width = iw * scale;
      const height = ih * scale;

      const page = pdfDoc.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
      return;
    }

    const portrait = iw <= ih;
    const pageWidth = portrait ? A4_SHORT : A4_LONG;
    const pageHeight = portrait ? A4_LONG : A4_SHORT;
    const margin = 24;
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const scale = Math.min(maxWidth / iw, maxHeight / ih);
    const width = iw * scale;
    const height = ih * scale;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height
    });
  }

  function resetImages() {
    imageState.items.forEach((item) => URL.revokeObjectURL(item.url));
    imageState.items = [];
    renderImageGrid();
  }

  /* ---------------------------------------------------------
     Gabung PDF
     --------------------------------------------------------- */

  async function addMergeFiles(fileList) {
    if (!ui.pdfLib) {
      showToast('Pustaka PDF belum termuat. Muat ulang halaman lalu coba lagi.');
      return;
    }

    const files = Array.from(fileList);
    const errors = [];
    let added = 0;

    for (const file of files) {
      const error = validatePdf(file);

      if (error) {
        errors.push(`${file.name}: ${error}`);
        continue;
      }

      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const doc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });

        mergeState.files.push({
          id: nextId(),
          name: file.name,
          size: file.size,
          bytes,
          pageCount: doc.getPageCount()
        });

        added += 1;
      } catch (error) {
        errors.push(`${file.name}: PDF tidak dapat dibaca (mungkin terenkripsi).`);
      }
    }

    renderMergeList();
    updateMergeUI();

    if (added > 0) {
      showView('mergeWorkspace');
    }

    if (errors.length > 0) {
      const extra = errors.length > 1 ? ` (+${errors.length - 1} lainnya)` : '';
      showToast(errors[0] + extra);
    }
  }

  function renderMergeList() {
    if (mergeState.files.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-state';
      empty.textContent = 'Belum ada file. Tambahkan minimal dua PDF untuk digabung.';
      el.mergeList.replaceChildren(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    mergeState.files.forEach((file, index) => {
      const row = document.createElement('li');
      row.className = 'file-row';
      row.dataset.id = String(file.id);

      const icon = document.createElement('span');
      icon.className = 'file-row-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = 'PDF';

      const info = document.createElement('div');
      info.className = 'file-row-info';

      const name = document.createElement('p');
      name.className = 'file-name';
      name.textContent = file.name;
      name.title = file.name;

      const sub = document.createElement('p');
      sub.className = 'file-sub';
      sub.textContent = `${formatBytes(file.size)} · ${file.pageCount} halaman`;

      info.append(name, sub);

      const actions = document.createElement('div');
      actions.className = 'file-row-actions';

      actions.append(
        makeIconButton('up', ICON_UP, 'Naikkan file', index === 0),
        makeIconButton('down', ICON_DOWN, 'Turunkan file', index === mergeState.files.length - 1),
        makeIconButton('remove', ICON_TRASH, 'Hapus file', false, true)
      );

      row.append(icon, info, actions);
      fragment.appendChild(row);
    });

    el.mergeList.replaceChildren(fragment);
  }

  function updateMergeUI() {
    const files = mergeState.files;
    const pageCount = files.reduce((sum, file) => sum + file.pageCount, 0);

    el.mergeInfo.textContent = files.length
      ? `${files.length} file · ${pageCount} halaman`
      : 'Belum ada file';
    el.mergeFileCount.textContent = String(files.length);
    el.mergePageCount.textContent = String(pageCount);
    el.mergeCount.textContent = `${files.length} file`;
    el.mergeSummary.textContent = `PDF · ${pageCount} halaman`;
    el.mergeClearBtn.disabled = files.length === 0;

    if (files.length < 2) {
      el.mergeConvertBtn.textContent = 'Tambahkan minimal 2 file';
    } else {
      el.mergeConvertBtn.textContent = `Gabungkan ${files.length} file`;
    }

    el.mergeConvertBtn.disabled = files.length < 2 || mergeState.busy;
  }

  async function startMergeConversion() {
    if (!ui.pdfLib || mergeState.busy || mergeState.files.length < 2) return;

    const files = mergeState.files.slice();
    const pageCount = files.reduce((sum, file) => sum + file.pageCount, 0);

    mergeState.busy = true;
    startJob('merge', 'Menggabungkan PDF…', `Menyiapkan ${files.length} file…`);

    try {
      const merged = await PDFLib.PDFDocument.create();

      for (let index = 0; index < files.length; index += 1) {
        if (progress.cancelled) {
          finishCancelled();
          return;
        }

        setProgress(
          (index / files.length) * 95,
          `Menyalin ${files[index].name} · ${index + 1} dari ${files.length}`
        );

        await nextPaint();

        const source = await PDFLib.PDFDocument.load(files[index].bytes, {
          ignoreEncryption: true
        });

        const pages = await merged.copyPages(source, source.getPageIndices());
        pages.forEach((page) => merged.addPage(page));

        setProgress(
          ((index + 1) / files.length) * 95,
          `File ${index + 1} selesai · ${index + 1} dari ${files.length}`
        );

        await nextTask();
      }

      if (progress.cancelled) {
        finishCancelled();
        return;
      }

      setProgress(97, 'Menyimpan PDF…');
      await nextPaint();

      const bytes = await merged.save();

      if (progress.cancelled) {
        finishCancelled();
        return;
      }

      mergeState.busy = false;

      handleResult(
        new Blob([bytes], { type: 'application/pdf' }),
        `${baseNameOf(files[0].name)}-gabungan.pdf`,
        `${files.length} PDF berhasil digabung menjadi satu file (${pageCount} halaman).`
      );
    } catch (error) {
      if (progress.cancelled) {
        finishCancelled();
        return;
      }

      console.error('[PDFtoPic]', error);
      mergeState.busy = false;
      progress.tool = null;
      showView('mergeWorkspace');
      updateMergeUI();
      showToast('Gagal menggabungkan PDF. Pastikan tidak ada file terenkripsi.');
    }
  }

  function resetMerge() {
    mergeState.files = [];
    renderMergeList();
  }

  /* ---------------------------------------------------------
     Pisah PDF
     --------------------------------------------------------- */

  async function beginSplit(file) {
    if (!ui.supported || !ui.pdfLib) {
      showToast('Browser atau pustaka PDF belum siap. Muat ulang halaman lalu coba lagi.');
      return;
    }

    const validationError = validatePdf(file);

    if (validationError) {
      showToast(validationError);
      return;
    }

    releaseSplitResources();

    const session = splitState.session;

    splitState.file = file;
    splitState.loaded = false;
    splitState.thumbsDone = false;
    splitState.busy = false;

    el.splitFileName.textContent = file.name;
    el.splitFileName.title = file.name;
    el.splitFileMeta.textContent = formatBytes(file.size);
    el.splitSelectionInfo.textContent = 'Menyiapkan pratinjau…';
    el.splitGrid.innerHTML = '';
    setThumbLoading(el.splitGrid, 'Membaca dokumen…');
    setBadge(el.splitBadge, el.splitBadgeText, 'Memuat…', 'loading');
    updateSplitUI();
    showView('splitWorkspace');

    let buffer;

    try {
      buffer = await file.arrayBuffer();
    } catch (error) {
      if (session !== splitState.session) return;
      showToast('File tidak dapat dibaca. Silakan pilih ulang file Anda.');
      resetSplit();
      return;
    }

    if (session !== splitState.session) return;

    splitState.bytes = new Uint8Array(buffer);

    try {
      const task = pdfjsLib.getDocument({
        data: splitState.bytes.slice(),
        isEvalSupported: false,
        useSystemFonts: true
      });

      splitState.pdfTask = task;
      const doc = await task.promise;

      if (session !== splitState.session) {
        doc.destroy();
        return;
      }

      splitState.doc = doc;
      splitState.numPages = doc.numPages;
      splitState.loaded = true;

      el.splitFileMeta.textContent = `${formatBytes(file.size)} · ${doc.numPages} halaman`;
      setBadge(el.splitBadge, el.splitBadgeText, 'Menyiapkan pratinjau…', 'loading');

      buildPageGrid(el.splitGrid, doc.numPages, splitState.selected);
      updateSplitUI();

      await generateThumbnails(
        doc,
        el.splitGrid,
        splitState.thumbUrls,
        () => session !== splitState.session,
        () => {
          splitState.thumbsDone = true;
          setBadge(el.splitBadge, el.splitBadgeText, `${splitState.numPages} halaman`, 'ready');
          updateSplitUI();
        }
      );
    } catch (error) {
      if (session !== splitState.session) return;
      resetSplit();
      showToast(describePdfError(error));
    }
  }

  function releaseSplitResources() {
    splitState.session += 1;

    if (splitState.pdfTask) {
      try {
        splitState.pdfTask.destroy();
      } catch (error) {
        /* ignore */
      }
      splitState.pdfTask = null;
    }

    if (splitState.doc) {
      try {
        splitState.doc.destroy();
      } catch (error) {
        /* ignore */
      }
      splitState.doc = null;
    }

    splitState.thumbUrls.forEach((url) => URL.revokeObjectURL(url));
    splitState.thumbUrls.clear();

    splitState.bytes = null;
    splitState.numPages = 0;
    splitState.loaded = false;
    splitState.thumbsDone = false;
    splitState.busy = false;
    splitState.selected.clear();
  }

  function resetSplit() {
    releaseSplitResources();
    splitState.file = null;

    el.splitFileName.textContent = 'dokumen.pdf';
    el.splitFileName.title = '';
    el.splitFileMeta.textContent = '—';
    el.splitGrid.innerHTML = '';
    el.splitSelectionInfo.textContent = 'Menyiapkan pratinjau…';
    setBadge(el.splitBadge, el.splitBadgeText, 'Memuat…', 'loading');

    updateSplitUI();
    showView('upload');
  }

  function updateSplitUI() {
    const count = splitState.selected.size;
    const total = splitState.numPages;

    el.splitSelectedCount.textContent =
      count === 0 ? 'Belum ada halaman dipilih' : `${count} halaman dipilih`;
    el.splitOutputSummary.textContent =
      splitState.mode === 'each' ? 'Satu PDF per halaman · ZIP' : 'Satu PDF';

    if (total > 0) {
      el.splitSelectionInfo.textContent = splitState.thumbsDone
        ? `${count} dari ${total} halaman dipilih`
        : `${count} dari ${total} dipilih · memuat pratinjau…`;
    } else {
      el.splitSelectionInfo.textContent = 'Menyiapkan pratinjau…';
    }

    el.splitSelectAllBtn.disabled = !splitState.loaded || count === total;
    el.splitSelectNoneBtn.disabled = !splitState.loaded || count === 0;

    let label;

    if (!splitState.loaded) {
      label = 'Memuat dokumen…';
    } else if (!splitState.thumbsDone) {
      label = 'Menyiapkan pratinjau…';
    } else if (count === 0) {
      label = 'Pilih halaman dulu';
    } else if (splitState.mode === 'each') {
      label = `Pecah ${count} halaman`;
    } else {
      label = `Ekstrak ${count} halaman`;
    }

    el.splitConvertBtn.textContent = label;
    el.splitConvertBtn.disabled =
      !splitState.loaded ||
      !splitState.thumbsDone ||
      count === 0 ||
      splitState.busy;
  }

  async function startSplitConversion() {
    if (
      !ui.pdfLib ||
      splitState.busy ||
      !splitState.loaded ||
      !splitState.thumbsDone ||
      !splitState.bytes
    ) {
      return;
    }

    const pages = Array.from(splitState.selected).sort((a, b) => a - b);

    if (pages.length === 0) {
      showToast('Pilih minimal satu halaman untuk dipisah.');
      return;
    }

    const mode = splitState.mode;
    const base = baseNameOf(splitState.file ? splitState.file.name : 'dokumen');
    const padLength = Math.max(1, String(splitState.numPages).length);
    const bytes = splitState.bytes;

    splitState.busy = true;
    startJob('split', 'Memisahkan PDF…', `Menyiapkan ${pages.length} halaman…`);

    try {
      const source = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });

      if (mode === 'single') {
        setProgress(20, 'Menyalin halaman…');
        await nextPaint();

        const output = await PDFLib.PDFDocument.create();
        const copied = await output.copyPages(
          source,
          pages.map((pageNumber) => pageNumber - 1)
        );
        copied.forEach((page) => output.addPage(page));

        if (progress.cancelled) {
          finishCancelled();
          return;
        }

        setProgress(85, 'Menyimpan PDF…');
        await nextPaint();

        const outputBytes = await output.save();

        if (progress.cancelled) {
          finishCancelled();
          return;
        }

        splitState.busy = false;

        handleResult(
          new Blob([outputBytes], { type: 'application/pdf' }),
          `${base}-halaman.pdf`,
          `${pages.length} halaman berhasil diekstrak menjadi satu PDF.`
        );
        return;
      }

      const files = [];

      for (let index = 0; index < pages.length; index += 1) {
        if (progress.cancelled) {
          finishCancelled();
          return;
        }

        const pageNumber = pages[index];

        setProgress(
          (index / pages.length) * 70,
          `Membuat PDF halaman ${pageNumber} · ${index + 1} dari ${pages.length}`
        );

        await nextPaint();

        const output = await PDFLib.PDFDocument.create();
        const copied = await output.copyPages(source, [pageNumber - 1]);
        copied.forEach((page) => output.addPage(page));

        const outputBytes = await output.save();

        files.push({
          name: `${base}-hal-${String(pageNumber).padStart(padLength, '0')}.pdf`,
          blob: new Blob([outputBytes], { type: 'application/pdf' })
        });

        await nextTask();
      }

      if (progress.cancelled) {
        finishCancelled();
        return;
      }

      if (files.length === 1) {
        splitState.busy = false;
        handleResult(files[0].blob, files[0].name, '1 halaman berhasil diekstrak menjadi PDF.');
        return;
      }

      setProgress(72, 'Membuat file ZIP · 0%');
      await nextPaint();

      const zipName = `${base}-halaman.zip`;
      const zipBlob = await zipFiles(files, zipName, (percent) => {
        if (progress.cancelled) return;
        setProgress(72 + percent * 0.26, `Membuat file ZIP · ${Math.round(percent)}%`);
      });

      if (progress.cancelled) {
        finishCancelled();
        return;
      }

      splitState.busy = false;

      handleResult(
        zipBlob,
        zipName,
        `${files.length} halaman berhasil dipecah menjadi ${files.length} PDF dalam satu file ZIP.`
      );
    } catch (error) {
      if (progress.cancelled) {
        finishCancelled();
        return;
      }

      console.error('[PDFtoPic]', error);
      splitState.busy = false;
      progress.tool = null;
      showView('splitWorkspace');
      updateSplitUI();
      showToast('Gagal memisahkan PDF. Pastikan file tidak terenkripsi.');
    }
  }

  /* ---------------------------------------------------------
     ZIP worker
     --------------------------------------------------------- */

  function zipFiles(files, zipName, onProgress) {
    return new Promise((resolve, reject) => {
      let worker;

      try {
        worker = new Worker(new URL(ZIP_WORKER_PATH, document.baseURI));
      } catch (error) {
        reject(error);
        return;
      }

      const job = {
        worker,
        reject,
        cleanup: null
      };

      job.cleanup = () => {
        if (ui.zipJob === job) ui.zipJob = null;
        try {
          worker.terminate();
        } catch (error) {
          /* ignore */
        }
      };

      ui.zipJob = job;

      worker.onmessage = (event) => {
        const message = event.data || {};

        if (message.type === 'progress') {
          onProgress(Number(message.percent) || 0);
          return;
        }

        if (message.type === 'done') {
          job.cleanup();
          resolve(message.blob);
          return;
        }

        if (message.type === 'error') {
          job.cleanup();
          reject(new Error(message.message || 'Gagal membuat file ZIP.'));
        }
      };

      worker.onerror = () => {
        job.cleanup();
        reject(new Error('Gagal membuat file ZIP.'));
      };

      worker.postMessage({
        type: 'zip',
        zipName,
        files: files.map((file) => ({ name: file.name, blob: file.blob }))
      });
    });
  }

  function cancelZipJob() {
    const job = ui.zipJob;
    if (!job) return;

    ui.zipJob = null;

    try {
      job.worker.terminate();
    } catch (error) {
      /* ignore */
    }

    job.reject(new Error('Konversi dibatalkan.'));
  }

  /* ---------------------------------------------------------
     Progress, results, views
     --------------------------------------------------------- */

  function startJob(tool, title, status) {
    progress.tool = tool;
    progress.cancelled = false;
    progress.activeRenderTask = null;

    el.progressTitle.textContent = title;
    el.cancelBtn.disabled = false;
    el.cancelBtn.textContent = 'Batalkan';
    setProgress(0, status);
    showView('progress');
  }

  function cancelJob() {
    if (!progress.tool || progress.cancelled) return;

    progress.cancelled = true;
    el.cancelBtn.disabled = true;
    el.cancelBtn.textContent = 'Membatalkan…';
    el.progressStatus.textContent = 'Membatalkan proses…';

    if (progress.activeRenderTask) {
      try {
        progress.activeRenderTask.cancel();
      } catch (error) {
        /* ignore */
      }
    }

    cancelZipJob();
  }

  function finishCancelled() {
    const tool = progress.tool;

    progress.tool = null;
    progress.cancelled = false;
    progress.activeRenderTask = null;

    cancelZipJob();

    if (tool === 'pdfToImage') pdfState.busy = false;
    if (tool === 'imageToPdf') imageState.busy = false;
    if (tool === 'merge') mergeState.busy = false;
    if (tool === 'split') splitState.busy = false;

    el.cancelBtn.disabled = false;
    el.cancelBtn.textContent = 'Batalkan';

    showView(workspaceFor(tool));
    refreshWorkspaceUI(tool);
    showToast('Proses dibatalkan.', 'info');
  }

  function workspaceFor(tool) {
    switch (tool) {
      case 'imageToPdf':
        return 'imageWorkspace';
      case 'merge':
        return 'mergeWorkspace';
      case 'split':
        return 'splitWorkspace';
      default:
        return 'workspace';
    }
  }

  function refreshWorkspaceUI(tool) {
    if (tool === 'pdfToImage') updatePdfSelectionUI();
    if (tool === 'imageToPdf') updateImageUI();
    if (tool === 'merge') updateMergeUI();
    if (tool === 'split') updateSplitUI();
  }

  function handleResult(blob, filename, message) {
    progress.tool = null;
    progress.cancelled = false;
    progress.activeRenderTask = null;

    if (ui.resultUrl) {
      URL.revokeObjectURL(ui.resultUrl);
    }

    ui.resultUrl = URL.createObjectURL(blob);
    ui.resultName = filename;

    setProgress(100, 'Selesai!');
    el.progressTitle.textContent = 'Selesai!';
    el.successText.textContent = message;
    el.successFilename.textContent = filename;
    el.successFilename.title = filename;

    showView('success');

    if (ui.autoTimer) {
      window.clearTimeout(ui.autoTimer);
    }

    ui.autoTimer = window.setTimeout(() => {
      if (ui.resultUrl) {
        triggerDownload(ui.resultUrl, ui.resultName);
      }
    }, 500);
  }

  function resetAll() {
    releasePdfResources();
    pdfState.file = null;

    el.fileName.textContent = 'dokumen.pdf';
    el.fileName.title = '';
    el.fileMeta.textContent = '—';
    el.thumbGrid.innerHTML = '';
    el.selectionInfo.textContent = 'Menyiapkan pratinjau…';
    setBadge(el.loadBadge, el.loadBadgeText, 'Memuat…', 'loading');

    resetImages();
    updateImageUI();

    resetMerge();
    updateMergeUI();

    releaseSplitResources();
    splitState.file = null;
    el.splitFileName.textContent = 'dokumen.pdf';
    el.splitFileName.title = '';
    el.splitFileMeta.textContent = '—';
    el.splitGrid.innerHTML = '';
    el.splitSelectionInfo.textContent = 'Menyiapkan pratinjau…';
    setBadge(el.splitBadge, el.splitBadgeText, 'Memuat…', 'loading');
    updateSplitUI();

    if (ui.resultUrl) {
      URL.revokeObjectURL(ui.resultUrl);
      ui.resultUrl = null;
    }

    ui.resultName = '';

    if (ui.autoTimer) {
      window.clearTimeout(ui.autoTimer);
      ui.autoTimer = null;
    }

    el.successFilename.textContent = '—';
    el.successFilename.title = '';
    el.cancelBtn.disabled = false;
    el.cancelBtn.textContent = 'Batalkan';

    updatePdfSelectionUI();
    showView('upload');
  }

  function showView(name) {
    const views = {
      upload: el.uploadView,
      workspace: el.workspaceView,
      imageWorkspace: el.imageWorkspaceView,
      mergeWorkspace: el.mergeWorkspaceView,
      splitWorkspace: el.splitWorkspaceView,
      progress: el.progressView,
      success: el.successView
    };

    Object.entries(views).forEach(([key, node]) => {
      node.hidden = key !== name;
    });

    window.scrollTo({ top: 0, behavior: 'auto' });

    const focusMap = {
      workspace: el.workspaceHeading,
      imageWorkspace: el.imageWorkspaceHeading,
      mergeWorkspace: el.mergeWorkspaceHeading,
      splitWorkspace: el.splitWorkspaceHeading,
      progress: el.progressTitle,
      success: el.successTitle
    };

    const focusTarget = focusMap[name];

    if (focusTarget) {
      window.requestAnimationFrame(() => {
        focusTarget.focus({ preventScroll: true });
      });
    }
  }

  function triggerDownload(url, filename) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function setProgress(percent, status) {
    const value = Math.max(0, Math.min(100, Math.round(percent)));

    el.progressBar.style.width = `${value}%`;
    el.progressTrack.setAttribute('aria-valuenow', String(value));
    el.progressPercent.textContent = `${value}%`;

    if (typeof status === 'string') {
      el.progressStatus.textContent = status;
    }
  }

  function setBadge(badge, textNode, text, mode) {
    textNode.textContent = text;
    badge.classList.toggle('is-ready', mode === 'ready');
    badge.classList.toggle('is-loading', mode !== 'ready');

    const spinner = badge.querySelector('.mini-spinner');
    if (spinner) spinner.hidden = mode === 'ready';
  }

  function showToast(message, tone) {
    if (ui.toastTimer) {
      window.clearTimeout(ui.toastTimer);
    }

    el.toastText.textContent = message;
    el.toast.classList.toggle('toast--info', tone === 'info');
    el.toast.hidden = false;

    ui.toastTimer = window.setTimeout(hideToast, 8000);
  }

  function hideToast() {
    if (ui.toastTimer) {
      window.clearTimeout(ui.toastTimer);
      ui.toastTimer = null;
    }

    el.toast.hidden = true;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Gambar tidak dapat dibuat.'));
          }
        },
        type,
        quality
      );
    });
  }

  function releaseCanvas(canvas) {
    canvas.width = 1;
    canvas.height = 1;
  }

  function nextTask() {
    return new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  function nextPaint() {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => window.setTimeout(resolve, 0));
    });
  }

  function baseNameOf(name) {
    const base = String(name || 'dokumen')
      .replace(/\.[^.]+$/, '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);

    return base || 'dokumen';
  }

  function formatBytes(bytes) {
    if (!bytes || bytes < 0) return '0 KB';

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    const digits = value < 10 ? 1 : 0;
    return `${value.toLocaleString('id-ID', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })} ${units[unitIndex]}`;
  }
})();
