'use strict';

const e = React.createElement;

class basicButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = { liked: false };
  }

  render() {
    if (this.state.liked) {
      return 'You liked this.';
    }

    return e(
      'button',
      { onClick: () => this.setState({ liked: true }) },
      "test"
    );
  }
}

const domContainer = document.querySelector('#basicButton');
const root = ReactDOM.createRoot(domContainer);
root.render(e(basicButton));