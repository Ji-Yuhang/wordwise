import dictionary from '../dictionary.json';
import words from '../words.json';

import findAndReplaceDOMText from 'findandreplacedomtext'
import Lemmatizer from "./lemmatizer"

import $ from 'jquery';
import _ from 'lodash';
import pluralize from 'pluralize';

// HTML tags that should not traversed
const TAG_BLACKLIST = ['SCRIPT', 'RUBY', 'BUTTON', 'CANVAS', 'INPUT', 'TABLE', 'CODE', 'PRE'];
const DEFINITION_MAX_CHARS = 20;
const DIFFICULTY_THRESHOLD = 30;
const ARTICLE_SELECTOR = ['p', 'article', '.article', 'section', '.articles', '.article-text', '.story-content'].join(', ');

var lemmatizer = new Lemmatizer();

const displayedDefinitions = {};

const isToughWord = word => dictionary[word.toLowerCase()] && getWordDifficulty(word) >= DIFFICULTY_THRESHOLD;

const lookupDefinition = word => dictionary[word.toLowerCase()].definition;

const lookupDefinition1 = word => 
  { 
    if (words[word.toLowerCase()]) {
      console.log(words[word.toLowerCase()].m);
      return words[word.toLowerCase()].m;
    }
    else 
      {return ""} 
  };

const getWordDifficulty = word => dictionary[word.toLowerCase()].difficulty;

const wordsFromPara = paragraph => paragraph.split(' ');

const overflowText = text => {
  if(text.length > DEFINITION_MAX_CHARS)
    return text.slice(0, DEFINITION_MAX_CHARS-2).concat('...');
  return text;
}

const compose = f => g => x => f(g(x))

const getDefinition = compose(overflowText)(lookupDefinition1);

const annotateToughWord = word => {
    if(isToughWord(word) && !displayedDefinitions[word]) {
      displayedDefinitions[word] = true;
      return `<ruby class="annotation">${word}<rt>${getDefinition(word)}</rt></ruby>`;
    }
    return word;
}

const isValidTextNode = $node => {
  return $node.nodeType === $node.TEXT_NODE && $node.textContent.trim();
}

const traverseAndAnnotate = $node => {

  if(TAG_BLACKLIST.some(tag => tag === $node.tagName)) return;

  if(isValidTextNode($node)) {
    const words = wordsFromPara($node.textContent);
    const annotatedPara = words.map(annotateToughWord).join(' ');

    const $paragraph = document.createElement('div');
    $paragraph.innerHTML = annotatedPara;

    $node.replaceWith(...$paragraph.childNodes);

    return;
  }

  if($node.hasChildNodes()) {
    $node.childNodes.forEach(traverseAndAnnotate);
  }
}

const init = () => {
    const $content = document.querySelectorAll(ARTICLE_SELECTOR);
    console.log("init");
    console.log($content);
    $content.forEach(traverseAndAnnotate);
}

const stems = (word) => {
  let words = [];
  let singular_word = pluralize.singular(word);
  let lemmas = _.uniq(_.flatten(lemmatizer.lemmas(word).map(pair=> pair[0])))
  words.push(singular_word);
  words.concat(lemmas)
  console.log('singular_word:', word, singular_word,lemmas, words);

  return words;
}

window.onload = init;

const parentNodesTagNames = (node)=>{
  let current = node;
  let tagNames = [];
  while (!!current){
    if (current.tagName){
      tagNames.push(current.tagName);
    }
    current = current.parentNode;
  }
  return _.uniq(_.compact(tagNames));
}
const isParentIncludeBlackList = (node, tagName) => {
  let tagNames = parentNodesTagNames(node);
  //if(TAG_BLACKLIST.some(tag => tag === selection.anchorNode.tagName || tag === selection.anchorNode.parentNode.tagName)) return true;
  return TAG_BLACKLIST.some(tag => _.includes(tagNames, tag));
}
$(document).on('click', () => {
  let selection = window.getSelection();
  console.log("selection",selection.anchorNode.tagName, selection.anchorNode.parentNode.tagName, selection);

  // 祖先节点是否在黑名单当中
  if (isParentIncludeBlackList(selection.anchorNode) || isParentIncludeBlackList(selection.focusNode)) return;

  let word = selection.toString().trim();
  
  // 域名不处理
  if (word.includes("://")) return;

  // 不包含英文字符不处理
  if (!word.match(/\w+/)) {
    return;
  } else {
    // 替换所有非英文字符为空格
    word = word.replace(/\W/g, ' ').trim();
  }

  if (_.isEmpty(word)) return;

  // 拆分不同单词
  let words = word.split(/\s+/);
  let stem_words = _.uniq(_.flatten(words.map(w => stems(w))));

  console.log(word,words,stem_words);

  //console.log(lemmatizer.lemmas(word), (lemma) => ignore[lemma[0]]);
  stem_words.forEach(word => {
    findAndReplaceDOMText(selection.anchorNode.parentElement, {
      find: word,
      replace: function (portion) {
        let el = $(`<ruby class="annotation">${word}<rt>${getDefinition(word)}</rt></ruby>`);
        return el[0];
      }
    });

  })

});