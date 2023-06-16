import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

function JsonToPdf({
  data,
  bookPropertiesObs,
  styles,
  fileName,
  onRenderStart,
  onRenderComplete,
  imageUrl = 'https://cdn.door43.org/obs/jpg/360px/',
  showImages = true,
}) {
  const generatePdf = async () => {
    if (typeof onRenderStart === 'function') {
      onRenderStart();
    }
    const docDefinition = {
      content: [],
      styles: {
        title: { fontSize: 32, bold: true, alignment: 'center', ...styles.projectTitle },
        intro: { fontSize: 14, alignment: 'left', ...styles.intro },
        reference: {
          fontSize: 14,
          italics: true,
          alignment: 'center',
          ...styles.reference,
        },
        image: { margin: [0, 0, 0, 0], alignment: 'center', ...styles.image },
        text: { fontSize: 12, margin: [0, 0, 0, 16], ...styles.text },
        back: { fontSize: 14, alignment: 'center', ...styles.back },
      },
      pageBreakBefore: (currentNode) => {
        if (currentNode.style?.pageBreakBefore === 'always') {
          return true;
        }
        return currentNode.pageBreak === 'before' || currentNode.pageBreak === 'left';
      },
    };

    const getImageDataUrl = async (url) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Error fetching image data URL:', error);
        throw new Error('Invalid URL');
      }
    };

    const addTitlePage = () => {
      const { projectTitle, title } = bookPropertiesObs || {};

      if (projectTitle && title) {
        docDefinition.content.push(
          { text: projectTitle, style: 'title', pageBreakBefore: 'always' },
          { text: '\n' },
          { text: title, style: 'title', pageBreakBefore: 'always' }
        );
      }
    };

    const addIntroPage = () => {
      if (bookPropertiesObs?.intro) {
        docDefinition.content.push(
          { text: '', pageBreak: 'before' },
          { text: bookPropertiesObs.intro, style: 'intro', pageBreak: 'after' }
        );
      } else if (bookPropertiesObs?.projectTitle && bookPropertiesObs?.title) {
        docDefinition.content.push({ text: '', pageBreak: 'before' });
      }
    };

    const addDataToDocument = async (dataItem) => {
      if (dataItem.title) {
        docDefinition.content.push({ text: dataItem.title, style: 'title' });
      }

      for (const { path, text } of dataItem.verseObjects) {
        try {
          if (path && showImages) {
            const imageDataUrl = await getImageDataUrl(imageUrl + path);
            docDefinition.content.push({ image: imageDataUrl, style: 'image' });
          }

          if (text) {
            docDefinition.content.push({ text, style: 'text' });
          }
        } catch (error) {
          console.error('Error fetching image data URL:', error);
        }
      }

      docDefinition.content.push({
        text: dataItem.reference,
        style: 'reference',
        pageBreak: 'after',
      });
    };

    const addBackPage = () => {
      if (bookPropertiesObs?.back) {
        docDefinition.content.push({ text: bookPropertiesObs.back, style: 'back' });
      }
    };

    const generateAndDownloadPdf = () => {
      pdfMake.createPdf(docDefinition).download(fileName);
    };

    addTitlePage();
    addIntroPage();

    try {
      for (const dataItem of data) {
        await addDataToDocument(dataItem);
      }

      if (typeof onRenderComplete === 'function') {
        onRenderComplete();
      }

      addBackPage();
      generateAndDownloadPdf();
    } catch (error) {
      console.error('Error rendering PDF:', error);
      if (typeof onRenderComplete === 'function') {
        onRenderComplete(error);
      }
    }
  };

  return new Promise((resolve, reject) => {
    generatePdf()
      .then(() => resolve())
      .catch((error) => reject(error));
  });
}

export default JsonToPdf;
