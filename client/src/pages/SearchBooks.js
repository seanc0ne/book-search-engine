import React, { useState } from 'react';
import {
  Jumbotron,
  Container,
  Col,
  Form,
  Button,
  Card,
  CardColumns,
} from 'react-bootstrap';
import Auth from '../utils/auth';
import { searchGoogleBooks } from '../utils/API';
import { useQuery, useMutation } from '@apollo/react-hooks';
import { SAVE_BOOK } from '../utils/mutations';
import { GET_ME_BOOKS } from '../utils/queries';
const SearchBooks = () => {
  // create state for holding returned google api data
  const [searchedBooks, setSearchedBooks] = useState([]);
  // create state for holding our search field data
  const [searchInput, setSearchInput] = useState('');
  // query me to extract bookIds from user's array of savedBooks
  const { data } = useQuery(GET_ME_BOOKS);
  const usersavedBooks = data?.me.savedBooks || [];
  const [saveBook, { error }] = useMutation(SAVE_BOOK, {
    update(cache, { data: { saveBook } }) {
      // update me object's cache, appending saved book to the end of the array
      const { me } = cache.readQuery({ query: GET_ME_BOOKS });
      cache.writeQuery({
        query: GET_ME_BOOKS,
        data: { me: { ...me, savedBooks: [...me.savedBooks, saveBook] } },
      });
    },
  });
  // create method to search for books and set state on form submit
  const handleFormSubmit = async (event) => {
    event.preventDefault();
    if (!searchInput) {
      return false;
    }
    try {
      const response = await searchGoogleBooks(searchInput);
      if (!response.ok) {
        throw new Error('something went wrong!');
      }
      const { items } = await response.json();
      const bookData = items.map((book) => ({
        bookId: book.id,
        authors: book.volumeInfo.authors || ['No author to display'],
        title: book.volumeInfo.title,
        description: book.volumeInfo.description,
        image: book.volumeInfo.imageLinks?.thumbnail || '',
        link: book.volumeInfo.infoLink || '',
      }));
      setSearchedBooks(bookData);
      setSearchInput('');
    } catch (err) {
      console.error(err);
    }
  };
  // logic to toggle save button
  const isSaved = (currentBookId) => {
    return usersavedBooks.some(
      (savedBook) => savedBook.bookId === currentBookId
    );
  };
  // create function to handle saving a book to our database
  const handleSaveBook = async (bookId) => {
    // find the book in `searchedBooks` state by the matching id
    const bookToSave = searchedBooks.find((book) => book.bookId === bookId);
    // get token
    const token = Auth.loggedIn() ? Auth.getToken() : null;
    if (!token) {
      return false;
    }
    try {
      // const response = await saveBook(bookToSave, token);
      await saveBook({
        variables: { bookToSave },
      });
      isSaved(bookId);
      document.getElementById(bookId).innerHTML = 'SAVED';
      document.getElementById(bookId).disabled = true;
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <>
      <Jumbotron fluid className="text-light bg-dark">
        <Container>
          <h1>Search for Books!</h1>
          <Form onSubmit={handleFormSubmit}>
            <Form.Row>
              <Col xs={12} md={8}>
                <Form.Control
                  name="searchInput"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  type="text"
                  size="lg"
                  placeholder="Search for a book"
                />
              </Col>
              <Col xs={12} md={4}>
                <Button type="submit" variant="success" size="lg">
                  Submit Search
                </Button>
              </Col>
            </Form.Row>
          </Form>
        </Container>
      </Jumbotron>
      <Container>
        <h2>
          {searchedBooks.length
            ? `Viewing ${searchedBooks.length} results:`
            : 'Search for a book to begin'}
        </h2>
        <CardColumns>
          {searchedBooks.map((book) => {
            return (
              <Card key={book.bookId} border="dark">
                {book.image ? (
                  <Card.Img
                    src={book.image}
                    alt={`The cover for ${book.title}`}
                    variant="top"
                  />
                ) : null}
                <Card.Body>
                  <Card.Title>{book.title}</Card.Title>
                  <p className="small">Authors: {book.authors}</p>
                  <Card.Text>{book.description}</Card.Text>
                  <p className="small">
                    <a
                      href={book.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      alt="link to google books site"
                    >
                      See more on Google Books ...
                    </a>
                  </p>
                  {Auth.loggedIn() && (
                    <>
                      <Button
                        disabled={isSaved(book.bookId)}
                        className="btn-block btn-info"
                        id={book.bookId}
                        onClick={() => handleSaveBook(book.bookId)}
                      >
                        {isSaved(book.bookId) ? 'SAVED' : 'Save this Book!'}
                      </Button>
                      {error && (
                        <span className="ml-2 text-error">
                          Something went wrong...
                        </span>
                      )}
                    </>
                  )}
                </Card.Body>
              </Card>
            );
          })}
        </CardColumns>
      </Container>
    </>
  );
};
export default SearchBooks;